import { bindContextLossHandlers, getSharedResource, registerScene, touchScene, unregisterScene } from './sceneContextRegistry'

type ThreeModule = typeof import('three')

export type FlowVisionSceneState =
  | 'idle'
  | 'capture'
  | 'understand'
  | 'route'
  | 'monitor'
  | 'intelligence'

export interface LabelPosition {
  id: string
  label: string
  x: number
  y: number
  visible: boolean
}

export interface FlowVisionSceneOptions {
  lowPower: boolean
  width: number
  height: number
  /** Called when the registry evicts this instance (context-budget cap) or the GPU context is
   * lost — either way the handle is now dead; the caller should null its ref so a later
   * IntersectionObserver "visible" event re-creates a fresh scene. */
  onReset: () => void
  onLabelsUpdate?: (labels: LabelPosition[]) => void
}

export interface FlowVisionSceneHandle {
  setState: (state: FlowVisionSceneState) => void
  setProgress: (progress: number) => void
  setPointer: (x: number, y: number) => void
  onResize: (width: number, height: number) => void
  pause: () => void
  resume: () => void
  dispose: () => void
}

const FLOW_INK = 0xf5f5f0
const FLOW_SIGNAL = 0xff6a2a
const FLOW_MUTED = 0x8b8b87

const DEPARTMENTS = [
  { id: 'finance', label: 'Finance', angle: -1.1 },
  { id: 'ops', label: 'Operations', angle: -0.4 },
  { id: 'management', label: 'Management', angle: 0.4 },
  { id: 'records', label: 'Records', angle: 1.1 },
]

const ROUTE_RADIUS = 3.4

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

const CURVE_EPSILON = 1e-4

/**
 * three.js's CatmullRomCurve3#getPointAt can throw ("reading 'x' of undefined" inside
 * distanceToSquared) when its internal arc-length remapping lands a sample exactly on, or a hair
 * past, the curve's 0/1 boundary — reproducible in practice with a continuously swept phase
 * (confirmed: ~4/6 fresh page loads crashed the render loop before this clamp). Never sample the
 * true endpoints.
 */
function safeCurvePoint(curve: { getPointAt: (u: number) => InstanceType<ThreeModule['Vector3']> }, u: number) {
  return curve.getPointAt(clamp(u, CURVE_EPSILON, 1 - CURVE_EPSILON))
}

function staggeredT(globalT: number, index: number, count: number) {
  const start = count > 1 ? (index / count) * 0.5 : 0
  return clamp((globalT - start) / 0.5, 0, 1)
}

export async function createFlowVisionScene(
  canvas: HTMLCanvasElement,
  options: FlowVisionSceneOptions,
): Promise<FlowVisionSceneHandle> {
  const THREE: ThreeModule = await import('three')

  const documentCount = options.lowPower ? 5 : 9
  const particleCount = options.lowPower ? 24 : 56
  const idleOrbitRadius = options.lowPower ? 1.05 : 1.7

  const departmentAnchors = DEPARTMENTS.map((dept, i) => new THREE.Vector3(
    Math.sin(dept.angle) * ROUTE_RADIUS,
    i % 2 === 0 ? 0.15 : -0.15,
    Math.cos(dept.angle) * ROUTE_RADIUS,
  ))

  const outboundCurves = departmentAnchors.map(anchor => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    anchor.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0.7, 0)),
    anchor,
  ]))

  const inboundCurves = departmentAnchors.map(anchor => new THREE.CatmullRomCurve3([
    anchor.clone().multiplyScalar(1.7).add(new THREE.Vector3(0, 2.6, 0)),
    anchor.clone().multiplyScalar(1.0).add(new THREE.Vector3(0, 1.4, 0)),
    new THREE.Vector3(0, 0, 0),
  ]))

  const cameraTargets: Record<FlowVisionSceneState, { position: InstanceType<ThreeModule['Vector3']>; fov: number }> = {
    idle: { position: new THREE.Vector3(0, 0.3, 6), fov: 42 },
    capture: { position: new THREE.Vector3(0, 0.7, 5.2), fov: 42 },
    understand: { position: new THREE.Vector3(0, 0.35, 4), fov: 40 },
    route: { position: new THREE.Vector3(0.4, 1.1, 6.6), fov: 44 },
    monitor: { position: new THREE.Vector3(0, 3.4, 9.6), fov: 50 },
    intelligence: { position: new THREE.Vector3(0, 1.2, 5.2), fov: 40 },
  }

  const disposables: Array<{ dispose: () => void }> = []

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, options.width / Math.max(options.height, 1), 0.1, 100)
  camera.position.set(0, 0.3, 6)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !options.lowPower,
    alpha: true,
    powerPreference: options.lowPower ? 'low-power' : 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.lowPower ? 1 : 2))
  renderer.setSize(options.width, options.height, false)

  const coreGeometry = getSharedResource('flow-scene-core-geometry', () => new THREE.IcosahedronGeometry(1, 1))
  const wireMaterial = new THREE.MeshBasicMaterial({ color: FLOW_INK, wireframe: true, transparent: true, opacity: 0.5 })
  const fillMaterial = new THREE.MeshBasicMaterial({ color: FLOW_SIGNAL, transparent: true, opacity: 0.08 })
  disposables.push(wireMaterial, fillMaterial)

  const core = new THREE.Mesh(coreGeometry, wireMaterial)
  const coreFill = new THREE.Mesh(coreGeometry, fillMaterial)
  coreFill.scale.setScalar(0.92)
  scene.add(core, coreFill)

  const documentGeometry = getSharedResource('flow-scene-document-geometry', () => new THREE.BoxGeometry(0.5, 0.7, 0.015))
  const documentMaterial = new THREE.MeshBasicMaterial({ color: FLOW_INK, transparent: true, opacity: 0.85 })
  disposables.push(documentMaterial)

  const documentMesh = new THREE.InstancedMesh(documentGeometry, documentMaterial, documentCount)
  scene.add(documentMesh)

  const dummy = new THREE.Object3D()
  const documentPhases = Array.from({ length: documentCount }, () => Math.random())

  const routeLines = outboundCurves.map((curve, i) => {
    const geometry = getSharedResource(`flow-scene-route-geometry-${i}`, () => new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)))
    const material = new THREE.LineBasicMaterial({ color: FLOW_MUTED, transparent: true, opacity: 0.12 })
    disposables.push(material)
    const line = new THREE.Line(geometry, material)
    scene.add(line)
    return line
  })

  const particleGeometry = new THREE.BufferGeometry()
  const particlePositions = new Float32Array(particleCount * 3)
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  const particleMaterial = new THREE.PointsMaterial({ color: FLOW_SIGNAL, size: 0.05, transparent: true, opacity: 0 })
  disposables.push(particleGeometry, particleMaterial)
  const particles = new THREE.Points(particleGeometry, particleMaterial)
  scene.add(particles)
  const particlePhases = Array.from({ length: particleCount }, () => Math.random())

  let currentState: FlowVisionSceneState = 'idle'
  let currentProgress = 0
  let frameId: number | null = null
  let disposed = false
  const startTime = performance.now()

  const cameraBase = new THREE.Vector3(0, 0.3, 6)
  const pointerTarget = new THREE.Vector2(0, 0)
  const pointerCurrent = new THREE.Vector2(0, 0)

  function updateDocuments(state: FlowVisionSceneState, t: number, elapsed: number) {
    for (let i = 0; i < documentCount; i++) {
      const deptIdx = i % DEPARTMENTS.length
      let position = dummy.position
      let scale = 0.6

      if (state === 'idle') {
        const angle = elapsed * 0.15 + (i / documentCount) * Math.PI * 2
        position.set(
          Math.sin(angle) * idleOrbitRadius,
          Math.sin(elapsed * 0.6 + documentPhases[i] * 6) * 0.2,
          Math.cos(angle) * idleOrbitRadius,
        )
        scale = options.lowPower ? 0.38 : 0.5
      }
      else if (state === 'capture') {
        const localT = staggeredT(t, i, documentCount)
        position.copy(safeCurvePoint(inboundCurves[deptIdx], localT))
        scale = smoothstep(0, 0.18, localT) * 0.65
      }
      else if (state === 'understand') {
        position.set(0, Math.sin(elapsed * 2 + i) * 0.08, 0)
        scale = 0.65
      }
      else if (state === 'route') {
        const localT = staggeredT(t, i, documentCount)
        position.copy(safeCurvePoint(outboundCurves[deptIdx], localT))
        scale = 0.65
      }
      else if (state === 'monitor') {
        position.copy(safeCurvePoint(outboundCurves[deptIdx], 1))
        scale = lerp(0.65, 0.5, t)
      }
      else {
        position.copy(safeCurvePoint(outboundCurves[deptIdx], lerp(1, 0.3, t)))
        scale = lerp(0.5, 0.28, t)
      }

      dummy.rotation.set(elapsed * 0.4 + i, elapsed * 0.25 + i, 0)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      documentMesh.setMatrixAt(i, dummy.matrix)
    }
    documentMesh.instanceMatrix.needsUpdate = true
  }

  function updateRoutesAndParticles(state: FlowVisionSceneState, elapsed: number) {
    const active = state === 'route' || state === 'monitor' || state === 'intelligence'

    routeLines.forEach((line) => {
      const material = line.material as InstanceType<ThreeModule['LineBasicMaterial']>
      material.opacity = active ? 0.5 : 0.12
      material.color.set(active ? FLOW_SIGNAL : FLOW_MUTED)
    })

    const positions = particleGeometry.attributes.position as InstanceType<ThreeModule['BufferAttribute']>
    for (let i = 0; i < particleCount; i++) {
      const deptIdx = i % DEPARTMENTS.length
      const phase = (elapsed * 0.2 + particlePhases[i]) % 1
      const point = safeCurvePoint(outboundCurves[deptIdx], phase)
      positions.setXYZ(i, point.x, point.y, point.z)
    }
    positions.needsUpdate = true
    particleMaterial.opacity = active ? 0.8 : 0
  }

  function updateCore(state: FlowVisionSceneState, t: number, elapsed: number) {
    const pulse = Math.sin(elapsed * 1.4) * 0.03

    if (state === 'understand') {
      fillMaterial.opacity = 0.14 + Math.sin(t * Math.PI) * 0.1
      wireMaterial.opacity = 0.65
    }
    else if (state === 'route') {
      fillMaterial.opacity = 0.08
      wireMaterial.opacity = 0.45
    }
    else if (state === 'intelligence') {
      fillMaterial.opacity = lerp(0.1, 0.3, t)
      wireMaterial.opacity = lerp(0.5, 0.9, t)
    }
    else {
      fillMaterial.opacity = 0.08 + pulse
      wireMaterial.opacity = 0.5
    }

    core.rotation.y += 0.0015
    core.rotation.x += 0.0004
    coreFill.rotation.copy(core.rotation)
  }

  function updateCamera(state: FlowVisionSceneState) {
    const target = cameraTargets[state]
    cameraBase.lerp(target.position, 0.05)
    camera.fov += (target.fov - camera.fov) * 0.05
    camera.updateProjectionMatrix()

    pointerCurrent.lerp(pointerTarget, 0.05)
    camera.position.set(cameraBase.x + pointerCurrent.x, cameraBase.y + pointerCurrent.y, cameraBase.z)
    camera.lookAt(0, 0, 0)
  }

  function computeLabelPositions(state: FlowVisionSceneState): LabelPosition[] {
    const shouldShow = state === 'route' || state === 'monitor' || state === 'intelligence'
    return DEPARTMENTS.map((dept, i) => {
      const ndc = departmentAnchors[i].clone().project(camera)
      const visible = shouldShow && ndc.z < 1
      return {
        id: dept.id,
        label: dept.label,
        x: (ndc.x * 0.5 + 0.5) * options.width,
        y: (-ndc.y * 0.5 + 0.5) * options.height,
        visible,
      }
    })
  }

  function renderFrame(nowMs: number) {
    const elapsed = (nowMs - startTime) / 1000

    updateCore(currentState, currentProgress, elapsed)
    updateDocuments(currentState, currentProgress, elapsed)
    updateRoutesAndParticles(currentState, elapsed)
    updateCamera(currentState)

    renderer.render(scene, camera)
    options.onLabelsUpdate?.(computeLabelPositions(currentState))

    frameId = requestAnimationFrame(renderFrame)
  }

  function teardown() {
    if (disposed) return
    disposed = true
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
    removeContextListeners()
    disposables.forEach(d => d.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
  }

  const removeContextListeners = bindContextLossHandlers(
    canvas,
    () => {
      dispose()
      options.onReset()
    },
    () => {},
  )

  const registryId = registerScene(teardown, options.onReset)

  function setState(state: FlowVisionSceneState) {
    currentState = state
  }

  function setProgress(progress: number) {
    currentProgress = clamp(progress, 0, 1)
  }

  function setPointer(x: number, y: number) {
    pointerTarget.set(clamp(x, -1, 1) * 0.25, clamp(y, -1, 1) * 0.15)
  }

  function onResize(width: number, height: number) {
    options.width = width
    options.height = height
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  function pause() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  function resume() {
    touchScene(registryId)
    if (frameId === null && !disposed) {
      frameId = requestAnimationFrame(renderFrame)
    }
  }

  function dispose() {
    teardown()
    unregisterScene(registryId)
  }

  frameId = requestAnimationFrame(renderFrame)

  return { setState, setProgress, setPointer, onResize, pause, resume, dispose }
}
