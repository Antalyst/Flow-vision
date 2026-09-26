# FlowVision Landing Page — Current State (for rebuild briefing)

This document describes how the landing page ("/") is put together today: the stack, the file
map, what each section does, how theming/animation work, and known rough edges. It's written so
it can be pasted to an AI assistant as ground truth before a redesign, without that assistant
having to re-derive it from the code.

## 1. Stack

- **Framework**: Nuxt 3 (Vue 3, `<script setup>`, file-based routing under `app/pages/`)
- **Styling**: Tailwind CSS, config at [tailwind.config.js](../tailwind.config.js)
- **Animation**: GSAP + `ScrollTrigger` plugin, used directly in components (no wrapper library)
- **Icons**: `Icon` component (Phosphor icon set, `ph:*` names)
- **Fonts**:
  - `font-primary` → Afacad (Google Font) — used only for marketing/display headlines
  - `font-dashboard` → currently mapped to **Inter** in `tailwind.config.js` (the app's design
    system doc calls for Geist here — this is a discrepancy worth resolving during rebuild, not
    something already fixed in code)

## 2. Route → file map

| Route | File | Notes |
|---|---|---|
| `/` | [app/pages/index.vue](../app/pages/index.vue) | The landing page itself — just stacks 4 section components |
| `/features` | uses [LandingFeaturesCanvas.vue](../app/components/landing/features/LandingFeaturesCanvas.vue) | A separate, more traditional marketing page (metrics strip, AI feature cards, architecture sections, CTA banner). Shares the same theme composable and nav, but is a distinct component tree under `components/landing/features/`. |
| layout | [app/layouts/default.vue](../app/layouts/default.vue) | Wraps every page; branches into a "marketing" chrome (sticky pill nav, vignette, grid texture) vs. the normal dashboard chrome, based on `useMarketingPage()` |

`index.vue` itself is trivial:

```vue
<div class="landing-page w-full">
  <LandingHeroSection />
  <LandingAiFeaturesSection />
  <LandingScrollVideoSection />
  <LandingBrandRevealSection />
</div>
```

All real content lives in `app/components/landing/*.vue`, one component per section, stacked in
that fixed order.

## 3. Theming model

[app/composables/useLandingTheme.ts](../app/composables/useLandingTheme.ts) is a **landing-only**
theme layer, isolated from the rest of the app's dashboard theme:

- `isLandingDark` — a global `useState` boolean, **defaults to `true`** (dark).
- `toggleLandingTheme()` — flips it.
- A pile of `computed()` class strings (`atmosphereBaseClass`, `featureCardClass`,
  `navCapsuleClass`, `pillBadgeClass`, etc.) that resolve to different Tailwind class sets
  depending on `isLandingDark`, plus a set of "legacy alias" computeds (`glassPanelClass`,
  `bentoSurfaceClass`, …) that just point at the same values under old names.

**Known dead control**: `default.vue` destructures `toggleLandingTheme` from the composable but
never wires it to a button — there is no visible light/dark switch anywhere in the nav. In
practice the landing page is always dark, and the light-mode class branches in every section are
unused code paths today.

## 4. Layout chrome ([default.vue](../app/layouts/default.vue))

For marketing routes (`isMarketingPage` true — `/`, `/features`, `/tracking`, `/pricing`,
`/about`, `/contact`, `/login`, etc. presumably), the layout adds, above the page content:

- A full-bleed vignette gradient + a faint animated grid-line texture background (dark or light
  variant depending on `isLandingDark`).
- A **sticky pill-shaped nav** (`rounded-full` capsule, `navCapsuleClass`) pinned to the top,
  containing: logo (swaps asset by theme), desktop link row (Home/Features/Tracking/Pricing/
  About/Contact), a "Sign in" link, and a hamburger button on mobile that opens a full-screen
  overlay menu (same links + "Sign in" + a solid "Get started" CTA button linking to `/register`).
- Non-marketing routes get a completely different, simpler always-dark pill nav (second `<nav>`
  block) — that one still has a leftover `openDocForm` handler for a "Contact" button, unrelated
  to the landing rebuild but worth knowing it exists.

## 5. The four landing sections, in order

### 5.1 Hero — [LandingHeroSection.vue](../app/components/landing/LandingHeroSection.vue)

- Full-viewport (`min-h-screen`) section, background is a single large PNG
  (`/bg/Hero/section-one/herobg.png`) covering the frame.
- A blurred orange "amoeba" glow blob sits behind everything, animated on a permanent GSAP loop:
  it morphs `border-radius`, slowly rotates 360°, pulses scale, and also **follows the mouse**
  (`@mousemove` → GSAP tween of x/y offset, damped).
- Centered headline "Flow Vision" (huge, uppercase, `font-primary`) + one-line subtitle "AI
  Powered Document Monitoring Framework" in candy-orange, both fade/slide in on mount.
- Six stat/metric cards (SLA %, documents processed, transit time, active offices, packet loss,
  tracking availability) — split 3-left / 3-right flanking the hero art on desktop
  (`grid-cols-12`, side columns pinned, center column empty so the background art shows through),
  collapsing to a simple 2–3 column grid on mobile. Cards fade in staggered on mount, then drift
  up/down on an infinite idle float (left cards float one direction, right cards the other).

### 5.2 AI Features — [LandingAiFeaturesSection.vue](../app/components/landing/LandingAiFeaturesSection.vue)

- Section header "AI Features".
- **Row 1**: 3-column bento grid of feature cards (Smart Summarization, Predictive Bottleneck
  Analysis, Contextual Document Discovery) — each card is an image well (4:3, PNG asset) + title
  (candy-orange) + description + a row of small pill tags.
- **Row 2**: one full-width card for "Natural Language Query (NLQ)" — image on the left (fixed
  width on desktop), copy + 3 sub-feature mini-blocks (tag + description) on the right.
- Entrance animation: header and cards fade/slide up on scroll via `ScrollTrigger` (`top 80%` /
  `top 75%` triggers, `toggleActions: play none none reverse` so it re-plays if you scroll back
  up past it and down again).

### 5.3 Scroll-driven video story — [LandingScrollVideoSection.vue](../app/components/landing/LandingScrollVideoSection.vue)

The most complex section — a **scroll-jacked, pinned, 5-chapter video sequence**:

- The `<section>` is artificially tall (`h-[1200vh]`) so there's a lot of scroll distance to work
  with; inside it, a `sticky top-0 h-screen` wrapper pins the viewport in place while the user
  scrolls through that 1200vh of height.
- A single `<video>` (`/bg/Hero/section-tree/output.mp4`, muted, no native controls) is scrubbed
  **by scroll position**, not by playback: GSAP ties `video.currentTime` to scroll progress
  (`scrub: 2`), so scrolling forward/back moves the video forward/back like a scrubber.
- The video starts as a small pill (`scale 0.53`, fully rounded, `opacity 0`) and animates to a
  full-bleed rectangle (`scale 1`, `border-radius 0`) over the first slice of the scroll range,
  then the remaining range scrubs playback through the 5 "chapters."
- Each chapter has three overlaid text blocks that crossfade in/out as their slice of scroll
  progress is reached: a top-left "Chapter 0X" heading + description, and two bottom
  cards (bottom-left / bottom-right) with a label/title/body each. Chapters cover: Enterprise
  Document Routing, Collaborative Decision Rooms, Real-Time Digital Pipeline, Smart QR
  Verification, Decentralized Storage Cloud.
- All content (chapter number/title/copy) is a plain JS array in the component (`chapters`) —
  not fetched from anywhere.
- Heavy cleanup on unmount: kills the timeline/ScrollTrigger and clears GSAP-applied inline
  styles so the DOM doesn't retain stale transforms.

### 5.4 Brand reveal — [LandingBrandRevealSection.vue](../app/components/landing/LandingBrandRevealSection.vue)

- Simple, static closing section: solid near-black background, centered logo image, large
  tracked-out "Flow Vision" wordmark, tagline underneath. No animation, no script logic at all
  (empty `<script setup>`).

## 6. Assets referenced

All under `public/bg/Hero/...` and `public/logo/...`:

- `public/bg/Hero/section-one/herobg.png` — hero background art
- `public/bg/Hero/section-two/*.png` — the 4 AI-feature illustrations (note: one filename has a
  literal double space, `"smart  sumarization.png"` — copy verbatim if reusing)
- `public/bg/Hero/section-tree/output.mp4` — the scroll-scrubbed video (note: folder is misspelled
  "section-tree", not "section-three" — again, copy verbatim, don't "fix" the path)
- `public/logo/new-logo.png` / `new-logo-dark.png` — logo, swapped by theme

## 7. Things to decide explicitly before/during a rebuild

Since this is going into a rebuild brief, these are the judgment calls baked into the current
version that a rebuild should either keep on purpose or deliberately change — not drift on by
accident:

1. **Dark-only in practice.** Light-mode class branches exist throughout but are unreachable
   (no toggle wired up). Decide: ship a real toggle, or delete the light branches and simplify.
2. **Scroll-jacked video section is expensive to maintain and accessibility-hostile** (no reduced-
   motion fallback, 1200vh of empty scroll space, video-as-scrubber is unusual UX). Worth an
   explicit decision on whether to keep this mechanic or replace with a simpler scroll-reveal.
3. **Copy is heavy on infrastructure/ops jargon** ("Unified Routing Mesh", "federated mesh",
   "custody network", "Decentralized Storage Cloud") — this conflicts with the project's own
   "basic English" copy rule (see the `redesign` skill) used elsewhere in the app. A rebuild
   should probably simplify this language rather than porting it as-is.
4. **`/features` is a second, separate landing-style page** reusing the same theme composable —
   any redesign of shared tokens (colors, radius, card styles) should be checked against both
   `/` and `/features`, not just `/`.
5. **`font-dashboard` currently resolves to Inter**, not Geist — confirm which is intended before
   a rebuild locks in typography, since the two will look different at the sizes used here.
