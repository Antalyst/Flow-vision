/**
 * Caps concurrent live WebGLRenderer contexts across all FlowVisionScene instances on the page.
 * Browsers cap concurrent WebGL contexts (commonly ~8-16); past that they silently evict the
 * OLDEST context (webglcontextlost, no exception) rather than failing at the new call site — on
 * a page with a hero scene plus several reused feature-block scenes, that reads as "a visual
 * quietly goes blank while scrolling." This registry disposes the least-recently-visible scene
 * itself, before that happens, and tells the evicted instance so it can null its own handle.
 */

const MAX_CONCURRENT_SCENES = 2

interface RegistryEntry {
  id: number
  lastVisible: number
  teardown: () => void
  onEvicted: () => void
}

let nextId = 1
const entries = new Map<number, RegistryEntry>()

function enforceCap() {
  while (entries.size > MAX_CONCURRENT_SCENES) {
    let oldest: RegistryEntry | null = null
    for (const entry of entries.values()) {
      if (!oldest || entry.lastVisible < oldest.lastVisible) oldest = entry
    }
    if (!oldest) return

    entries.delete(oldest.id)
    oldest.teardown()
    oldest.onEvicted()
  }
}

export function registerScene(teardown: () => void, onEvicted: () => void): number {
  const id = nextId++
  entries.set(id, { id, lastVisible: Date.now(), teardown, onEvicted })
  enforceCap()
  return id
}

export function touchScene(id: number) {
  const entry = entries.get(id)
  if (entry) entry.lastVisible = Date.now()
}

export function unregisterScene(id: number) {
  entries.delete(id)
}

const sharedResources = new Map<string, unknown>()

/** Cache for geometries/materials reused across scene instances (e.g. the core icosahedron) —
 * cheap, page-lifetime, never disposed by an individual scene's teardown. */
export function getSharedResource<T>(key: string, factory: () => T): T {
  if (!sharedResources.has(key)) {
    sharedResources.set(key, factory())
  }
  return sharedResources.get(key) as T
}

export function bindContextLossHandlers(
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onRestored: () => void,
) {
  const handleLost = (event: Event) => {
    event.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', handleLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
  }
}
