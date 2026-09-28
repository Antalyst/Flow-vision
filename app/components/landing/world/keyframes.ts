// The story, as camera + scene states. Each page section carries data-world-chapter="<id>";
// the world rests on a keyframe when its section is centred in the viewport and
// interpolates between neighbours while scrolling. Pure data — no three.js import.

export type ChapterId =
  | 'hero'
  | 'document'
  | 'understand'
  | 'route'
  | 'monitor'
  | 'f-understand'
  | 'f-route'
  | 'f-monitor'
  | 'f-insights'
  | 'reveal-data'
  | 'reveal-pattern'
  | 'reveal-intelligence'
  | 'metrics'
  | 'cta'

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Vec4 = [number, number, number, number]

export interface WorldKeyframe {
  /** Camera orbit: look-at point, distance, azimuth (around Y), elevation (above horizon). */
  target: Vec3
  distance: number
  azimuth: number
  elevation: number
  fov: number
  /** Where the subject sits on screen, as a fraction of viewport size (+x right, +y up). */
  offset: Vec2
  offsetPortrait: Vec2
  /** Gentle bounded camera sway, radians. */
  sway: number
  core: number
  scan: number
  /** Hero document path: 0 above frame · 1 presented · 2 inside core · 3 at Finance · 4 docked. */
  heroDoc: number
  heroDocVis: number
  /** Documents descending into the core. */
  inbound: number
  /** Documents travelling the network. */
  fleet: number
  /** Route tiers: primary (core→department), secondary (→office), tertiary (→outpost), pattern rings. */
  tierVis: Vec4
  tierActivity: Vec4
  focus: number
  /** 0 = focus fixed on the Finance route, 1 = focus cycles through primary routes. */
  focusCycle: number
  /** Node status colours (gray waiting · orange in progress · green done). */
  status: number
  insight: number
  /** Documents dissolve into data particles. */
  dataify: number
  pattern: number
  ground: number
  deptLabels: number
  classify: number
  docLabel: number
  dim: number
}

const BASE: WorldKeyframe = {
  target: [0, 0, 0],
  distance: 8,
  azimuth: 0,
  elevation: 0.2,
  fov: 36,
  offset: [0, 0],
  offsetPortrait: [0, 0.16],
  sway: 0.04,
  core: 0.5,
  scan: 0,
  heroDoc: 0,
  heroDocVis: 0,
  inbound: 0,
  fleet: 0,
  tierVis: [0, 0, 0, 0],
  tierActivity: [0, 0, 0, 0],
  focus: 0,
  focusCycle: 0,
  status: 0,
  insight: 0,
  dataify: 0,
  pattern: 0,
  ground: 0.5,
  deptLabels: 0,
  classify: 0,
  docLabel: 0,
  dim: 0,
}

function kf(partial: Partial<WorldKeyframe>): WorldKeyframe {
  return { ...BASE, ...partial }
}

export const KEYFRAMES: Record<ChapterId, WorldKeyframe> = {
  'hero': kf({
    target: [0.1, 0.05, 0],
    distance: 8.4,
    azimuth: 0.42,
    elevation: 0.17,
    fov: 36,
    offset: [0.2, 0.02],
    offsetPortrait: [0, 0.2],
    core: 0.6,
    inbound: 1,
    fleet: 0.35,
    tierVis: [0.85, 0.35, 0.1, 0],
    tierActivity: [0.25, 0.1, 0, 0],
    ground: 0.6,
  }),
  'document': kf({
    target: [0, 0.45, 2.3],
    distance: 3.4,
    azimuth: 0.28,
    elevation: 0.06,
    fov: 32,
    offset: [0.2, 0],
    offsetPortrait: [0, 0.2],
    sway: 0.02,
    core: 0.35,
    heroDoc: 1,
    heroDocVis: 1,
    inbound: 0.1,
    fleet: 0.1,
    tierVis: [0.4, 0.15, 0, 0],
    tierActivity: [0.1, 0, 0, 0],
    ground: 0.35,
    docLabel: 1,
  }),
  'understand': kf({
    target: [0, 0.35, 0],
    distance: 3.9,
    azimuth: -0.2,
    elevation: 0.1,
    fov: 32,
    offset: [0.2, 0],
    offsetPortrait: [0, 0.2],
    sway: 0.03,
    core: 1,
    scan: 1,
    heroDoc: 2,
    heroDocVis: 1,
    inbound: 0.05,
    fleet: 0.05,
    tierVis: [0.4, 0.1, 0, 0],
    tierActivity: [0.1, 0, 0, 0],
    ground: 0.35,
    classify: 1,
  }),
  'route': kf({
    target: [1.7, -0.85, 1.35],
    distance: 6.6,
    azimuth: 0.15,
    elevation: 0.55,
    fov: 38,
    offset: [0.18, 0],
    offsetPortrait: [0, 0.14],
    core: 0.7,
    scan: 0.1,
    heroDoc: 2.55,
    heroDocVis: 1,
    fleet: 0.2,
    tierVis: [0.9, 0.3, 0, 0],
    tierActivity: [0.15, 0, 0, 0],
    focus: 1,
    ground: 0.6,
    deptLabels: 1,
  }),
  'monitor': kf({
    target: [0, -1, 0],
    distance: 15.5,
    azimuth: 0.55,
    elevation: 0.72,
    fov: 40,
    offset: [0.16, 0],
    offsetPortrait: [0, 0.12],
    sway: 0.06,
    core: 0.7,
    heroDoc: 3.2,
    heroDocVis: 0.9,
    inbound: 0.5,
    fleet: 1,
    tierVis: [1, 1, 0.55, 0],
    tierActivity: [0.6, 0.45, 0.25, 0],
    focus: 0.4,
    ground: 0.9,
    deptLabels: 1,
  }),
  'f-understand': kf({
    target: [0, 0.35, 0],
    distance: 4.4,
    azimuth: -0.75,
    elevation: 0.18,
    fov: 34,
    offset: [0.2, 0],
    core: 0.9,
    scan: 0.7,
    heroDoc: 4,
    inbound: 1,
    fleet: 0.3,
    tierVis: [0.4, 0.1, 0, 0],
    tierActivity: [0.2, 0, 0, 0],
    ground: 0.4,
    classify: 1,
  }),
  'f-route': kf({
    target: [0, -1.1, 0],
    distance: 8,
    azimuth: -0.3,
    elevation: 1.05,
    fov: 38,
    offset: [-0.2, 0],
    core: 0.6,
    heroDoc: 4,
    inbound: 0.3,
    fleet: 0.7,
    tierVis: [1, 0.5, 0, 0],
    tierActivity: [0.12, 0.1, 0, 0],
    focus: 1,
    focusCycle: 1,
    ground: 0.7,
    deptLabels: 1,
  }),
  'f-monitor': kf({
    target: [0, -1.1, 0],
    distance: 13.5,
    azimuth: 1.25,
    elevation: 0.62,
    fov: 40,
    offset: [0.2, 0],
    sway: 0.05,
    core: 0.6,
    heroDoc: 4,
    inbound: 0.4,
    fleet: 0.9,
    tierVis: [1, 1, 0.4, 0],
    tierActivity: [0.5, 0.4, 0.2, 0],
    status: 1,
    ground: 0.8,
    deptLabels: 1,
  }),
  'f-insights': kf({
    target: [0, -0.45, 0],
    distance: 11.5,
    azimuth: 2.1,
    elevation: 0.38,
    fov: 40,
    offset: [-0.2, 0],
    sway: 0.05,
    core: 0.8,
    heroDoc: 4,
    inbound: 0.3,
    fleet: 0.5,
    tierVis: [0.8, 0.8, 0.2, 0],
    tierActivity: [0.3, 0.3, 0.1, 0],
    insight: 1,
    ground: 0.8,
    deptLabels: 0.6,
  }),
  'reveal-data': kf({
    target: [0, -1.2, 0],
    distance: 21,
    azimuth: 2.5,
    elevation: 1.05,
    fov: 42,
    offsetPortrait: [0, 0.06],
    sway: 0.05,
    core: 0.8,
    heroDoc: 4,
    inbound: 0.4,
    fleet: 0.6,
    tierVis: [1, 1, 1, 0.3],
    tierActivity: [0.5, 0.5, 0.5, 0.2],
    dataify: 0.5,
    ground: 0.9,
  }),
  'reveal-pattern': kf({
    target: [0, -1.2, 0],
    distance: 27,
    azimuth: 2.9,
    elevation: 1.32,
    fov: 44,
    offsetPortrait: [0, 0.06],
    sway: 0.04,
    core: 0.9,
    heroDoc: 4,
    tierVis: [1, 1, 1, 1],
    tierActivity: [0.6, 0.6, 0.6, 0.7],
    dataify: 1,
    pattern: 1,
    ground: 1,
  }),
  'reveal-intelligence': kf({
    target: [0, -1.2, 0],
    distance: 31,
    azimuth: 3.3,
    elevation: 1.45,
    fov: 44,
    offsetPortrait: [0, 0.06],
    sway: 0.03,
    core: 1.25,
    heroDoc: 4,
    tierVis: [1, 1, 1, 1],
    tierActivity: [0.85, 0.85, 0.85, 0.9],
    dataify: 1,
    pattern: 1,
    ground: 1,
  }),
  'metrics': kf({
    target: [0, -1.2, 0],
    distance: 36,
    azimuth: 3.6,
    elevation: 1.47,
    fov: 44,
    offsetPortrait: [0, 0],
    sway: 0.03,
    core: 1,
    heroDoc: 4,
    tierVis: [1, 1, 1, 1],
    tierActivity: [0.6, 0.6, 0.6, 0.7],
    dataify: 1,
    pattern: 1,
    ground: 1,
    dim: 0.6,
  }),
  'cta': kf({
    target: [0, -1.2, 0],
    distance: 44,
    azimuth: 4,
    elevation: 1.5,
    fov: 44,
    offsetPortrait: [0, 0],
    sway: 0.02,
    core: 0.9,
    heroDoc: 4,
    tierVis: [1, 1, 1, 1],
    tierActivity: [0.5, 0.5, 0.5, 0.6],
    dataify: 1,
    pattern: 1,
    ground: 1,
    dim: 0.76,
  }),
}

export function keyframeFor(id: string): WorldKeyframe {
  return KEYFRAMES[id as ChapterId] ?? KEYFRAMES.hero
}
