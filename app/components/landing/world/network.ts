import { CatmullRomCurve3, Vector3 } from 'three'

// Deterministic layout of the FlowVision ecosystem: a hub under the intelligence core,
// four departments, eight offices, sixteen outposts, and the routes between them.

export const GROUND_Y = -1.2
export const CORE_CENTER = new Vector3(0, 0.35, 0)
export const CORE_RADIUS = 0.9

const NODE_Y = GROUND_Y + 0.02
const ROUTE_Y = GROUND_Y + 0.03

export type RouteTier = 0 | 1 | 2 | 3
export type NodeKind = 'hub' | 'department' | 'office' | 'outpost'

export interface NetNode {
  id: string
  kind: NodeKind
  tier: RouteTier
  angle: number
  position: Vector3
  phase: number
  value: number
  labelId?: string
}

export interface NetRoute {
  tier: RouteTier
  index: number
  /** Arc-length-uniform samples; sample with sampleRoute (never CatmullRom#getPointAt per frame). */
  points: Vector3[]
  length: number
  width: number
}

export interface Network {
  hub: NetNode
  departments: NetNode[]
  nodes: NetNode[]
  routes: NetRoute[]
  /** Index of the primary route that ends at Finance (the story's route). */
  financeRoute: number
  primaryCount: number
}

const DEPARTMENT_DEFS = [
  { id: 'finance', offset: 0, labelId: 'dept-finance' },
  { id: 'records', offset: Math.PI / 2, labelId: 'dept-records' },
  { id: 'operations', offset: Math.PI, labelId: 'dept-operations' },
  { id: 'management', offset: Math.PI * 1.5, labelId: 'dept-management' },
]

const FINANCE_ANGLE = 0.9
const RADIUS = { department: 4.4, office: 8.2, outpost: 12.4 }
const WIDTH: Record<RouteTier, number> = { 0: 0.06, 1: 0.05, 2: 0.045, 3: 0.04 }

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function polar(angle: number, radius: number, y = NODE_Y) {
  return new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius)
}

function polylineLength(points: Vector3[]) {
  let length = 0
  for (let i = 1; i < points.length; i++) length += points[i]!.distanceTo(points[i - 1]!)
  return length
}

function bentRoute(from: Vector3, to: Vector3, bend: number, lift: number, segments: number) {
  const start = from.clone().setY(ROUTE_Y)
  const end = to.clone().setY(ROUTE_Y)
  const dir = end.clone().sub(start)
  const perp = new Vector3(-dir.z, 0, dir.x).normalize()
  const mid1 = start.clone().lerp(end, 0.33).addScaledVector(perp, bend).setY(ROUTE_Y + lift)
  const mid2 = start.clone().lerp(end, 0.66).addScaledVector(perp, bend * 0.55).setY(ROUTE_Y + lift * 0.7)
  return new CatmullRomCurve3([start, mid1, mid2, end]).getSpacedPoints(segments)
}

function ringArc(a0: number, a1: number, radius: number, segments: number) {
  const points: Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = a0 + (a1 - a0) * t
    points.push(polar(angle, radius, ROUTE_Y + Math.sin(t * Math.PI) * 0.05))
  }
  return points
}

export function buildNetwork(segments: number): Network {
  const random = mulberry32(2041)
  const nodes: NetNode[] = []
  const routes: NetRoute[] = []

  const addRoute = (tier: RouteTier, points: Vector3[]) => {
    routes.push({ tier, index: routes.length, points, length: polylineLength(points), width: WIDTH[tier] })
  }

  const hub: NetNode = { id: 'hub', kind: 'hub', tier: 0, angle: 0, position: new Vector3(0, NODE_Y, 0), phase: 0, value: 1 }
  nodes.push(hub)

  const departments = DEPARTMENT_DEFS.map((def) => {
    const angle = FINANCE_ANGLE + def.offset
    const node: NetNode = {
      id: def.id,
      kind: 'department',
      tier: 0,
      angle,
      position: polar(angle, RADIUS.department),
      phase: random(),
      value: 0.55 + random() * 0.45,
      labelId: def.labelId,
    }
    nodes.push(node)
    return node
  })

  const offices = departments.flatMap(dept => [-0.42, 0.42].map((spread) => {
    const angle = dept.angle + spread
    const node: NetNode = {
      id: `${dept.id}-office-${spread < 0 ? 'a' : 'b'}`,
      kind: 'office',
      tier: 1,
      angle,
      position: polar(angle, RADIUS.office),
      phase: random(),
      value: 0.3 + random() * 0.6,
    }
    nodes.push(node)
    return { node, dept }
  }))

  const outposts = offices.flatMap(({ node: office }) => [-0.19, 0.19].map((spread) => {
    const angle = office.angle + spread
    const node: NetNode = {
      id: `${office.id}-${spread < 0 ? 'l' : 'r'}`,
      kind: 'outpost',
      tier: 2,
      angle,
      position: polar(angle, RADIUS.outpost),
      phase: random(),
      value: 0.15 + random() * 0.4,
    }
    nodes.push(node)
    return { node, office }
  }))

  // Primary first so the story's Finance route is index 0.
  departments.forEach((dept, i) => addRoute(0, bentRoute(hub.position, dept.position, i % 2 ? -0.55 : 0.55, 0.22, segments)))
  offices.forEach(({ node, dept }, i) => addRoute(1, bentRoute(dept.position, node.position, i % 2 ? -0.35 : 0.35, 0.14, Math.round(segments * 0.8))))
  outposts.forEach(({ node, office }, i) => addRoute(2, bentRoute(office.position, node.position, i % 2 ? -0.2 : 0.2, 0.08, Math.round(segments * 0.6))))

  const ring = (list: NetNode[], radius: number, arcSegments: number) => {
    const sorted = [...list].sort((a, b) => a.angle - b.angle)
    sorted.forEach((node, i) => {
      const next = sorted[(i + 1) % sorted.length]!
      let a1 = next.angle
      if (a1 <= node.angle) a1 += Math.PI * 2
      addRoute(3, ringArc(node.angle, a1, radius, arcSegments))
    })
  }
  ring(departments, RADIUS.department, Math.round(segments * 0.9))
  ring(offices.map(o => o.node), RADIUS.office, Math.round(segments * 0.7))
  ring(outposts.map(o => o.node), RADIUS.outpost, Math.round(segments * 0.5))

  return { hub, departments, nodes, routes, financeRoute: 0, primaryCount: departments.length }
}

/** Linear interpolation over a route's arc-length-uniform samples. t is clamped to [0, 1]. */
export function sampleRoute(route: NetRoute, t: number, out: Vector3, tangent?: Vector3) {
  const pts = route.points
  const last = pts.length - 1
  const f = Math.min(Math.max(t, 0), 1) * last
  const i = Math.min(Math.floor(f), last - 1)
  const frac = f - i
  const a = pts[i]!
  const b = pts[i + 1]!
  out.copy(a).lerp(b, frac)
  if (tangent) tangent.copy(b).sub(a).normalize()
  return out
}
