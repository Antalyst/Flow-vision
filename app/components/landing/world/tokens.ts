// 3D side of the FlowVision marketing design system. Pure data — safe to import eagerly
// (never imports three.js). Hex values mirror the flow-* Tailwind tokens.

export const WORLD_COLORS = {
  void: 0x050505,
  ink: 0xf5f5f0,
  muted: 0x8b8b87,
  signal: 0xff6a2a,
  warm: 0xfff8ef,
  success: 0x16a34a,
  paperBack: 0xd9d5cc,
} as const

export type WorldTier = 'mobile' | 'tablet' | 'desktop' | 'wide'

export interface TierBudget {
  dprMax: number
  dprMin: number
  particles: number
  fleet: number
  streams: number
  routeSegments: number
  antialias: boolean
  atlasScale: number
}

export const TIER_BUDGET: Record<WorldTier, TierBudget> = {
  mobile: { dprMax: 1.5, dprMin: 0.75, particles: 320, fleet: 18, streams: 36, routeSegments: 40, antialias: false, atlasScale: 1 },
  tablet: { dprMax: 1.75, dprMin: 1, particles: 560, fleet: 30, streams: 60, routeSegments: 56, antialias: true, atlasScale: 1.5 },
  desktop: { dprMax: 2, dprMin: 1, particles: 900, fleet: 44, streams: 90, routeSegments: 72, antialias: true, atlasScale: 2 },
  wide: { dprMax: 2, dprMin: 1, particles: 1200, fleet: 56, streams: 110, routeSegments: 88, antialias: true, atlasScale: 2 },
}

export function resolveTier(width: number): WorldTier {
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  if (width < 1920) return 'desktop'
  return 'wide'
}

export const WORLD_MOTION = {
  /** How quickly the camera catches up with scroll (per second, exponential). */
  progressDamping: 3.4,
  moodDamping: 2.6,
  /** Fraction at each end of a keyframe segment where the camera rests. */
  keyframeHold: 0.14,
} as const
