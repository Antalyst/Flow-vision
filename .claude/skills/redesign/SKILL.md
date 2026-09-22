---
name: redesign
description: FlowVision's visual design system and redesign preferences (colors, radius, typography, wording, workflow). Load this automatically whenever the user asks to redesign, restyle, relayout, or "make it look better/modern/user-friendly" for any page or component in this project — don't wait for them to ask for it by name.
---

# FlowVision redesign preferences

This is the standing design direction for FlowVision, established across prior redesign work. Apply it by default on any redesign/restyle task in this repo — don't ask the user to repeat it.

## Color palette (already in `tailwind.config.js` — reuse the tokens, don't hardcode hex)

- Accent (Shopee-style red-orange): `candy-orange` `#EE4D2D`, hover `candy-hover` `#D6431F`
- Light mode: canvas `white-surface` `#F6F6F7` (soft off-white), cards `white-pure` `#FEFEFE`, muted text `white-muted` `#8F8F94` — cards must visibly lift off the canvas, never the same shade as the page background
- Dark mode: canvas `onyx-black` `#121212`, sidebar `onyx-sidebar` `#161616`, cards `onyx-card` `#1A1A1A`, borders `onyx-border` `#2A2A2A`
- Semantic status colors: `success` `#16A34A`, `warning` `#F59E0B`, `danger` `#DC2626`
- **Charts/canvas draw color as raw hex** (Chart.js, Highcharts, inline SVG) — these do NOT inherit Tailwind config changes automatically. Whenever the palette changes, grep for stale hex literals (old orange `#F47D2F`/`#D96518`, or off-brand colors like indigo `#6366F1`) in chart configs and SVG `stroke`/`fill`/`stop-color` attributes and update them by hand.
- Keep one accent color across the whole app. Don't invent a second brand hue per portal/section (a past mistake: employee portal drifted to plain Tailwind `sky-500`, messenger to `amber-500` — both off-token). If a section needs visual distinction, use a small label/badge, not a different interactive palette.

## Shopee-style status language (use this, don't invent new color-per-status schemes)

For anything with a lifecycle/progress state (document status, delivery stage, etc.), collapse to **3 tiers**, not 5+ arbitrary hues:
- **Gray** = not started / neutral / registered
- **Orange** (brand accent) = in progress / active / "in motion"
- **Green** (`success`) = done / completed / delivered

This applies to status badges, progress bars, stepper/roadmap checkpoints, and icon tints. It's deliberately simple so a non-technical user reads state at a glance.

## Radius system — modern, not sharp

An earlier direction used `rounded-none` everywhere ("high-end minimalist"). That has been superseded — the app has moved to a modern rounded language:
- Cards / panels: `rounded-2xl`
- Buttons, inputs, search bars, dropdowns: `rounded-xl`
- Small icon-only buttons, tooltips, table action icons: `rounded-lg`
- Badges, pills, avatars, progress bars, status dots, numbered rank circles: `rounded-full`

Don't reintroduce `rounded-none`. If you find it on a page being redesigned, replace it per the scale above.

## No glow effects — flat and professional, not neon

Some older components had blurred colored "glow" shadows (`shadow-[0_0_20px_rgba(238,77,45,0.4)]`-style arbitrary values, `shadow-candy-orange/20` halos, gradient buttons combined with `hover:-translate-y-0.5` lift) around buttons, badges, and selected states. This reads as flashy/gamer-RGB, not professional business software — remove it wherever found, on any component you touch:
- Buttons: solid brand color (`bg-candy-orange`), not a gradient (`bg-gradient-to-r from-candy-orange to-candy-hover`). Hover = `hover:bg-candy-hover` (a plain color transition), not a lift-and-glow combo.
- Cards/selected states: a border/background tint (`border-candy-orange bg-candy-orange/10`) is enough to show emphasis — no blurred halo shadow behind it.
- Keep only flat, standard shadows (`shadow-sm`, `shadow-card` from `tailwind.css`) for elevation. Colored/blurred shadows are the exception, not the default — don't add them back in for "polish."
- A subtle gradient is still fine for one specific case: a soft top-fade wash behind a panel header (`bg-gradient-to-b from-white/[0.02] to-transparent`-style) — that's depth, not glow, and doesn't use the brand color.

## Typography

- UI/body text (dashboards, tables, app shell): **Geist** (`font-dashboard` in Tailwind config), loaded via Google Fonts
- Display/marketing text (landing page hero, login/register headlines): **Afacad** (`font-primary`) — keep reserved for those contexts, don't apply it to dashboard/app-shell text (a past bug: it was wrapped around the whole app shell then immediately overridden — dead weight)

## Labels and copy: "basic English" rule

Every label, title, subtitle, empty-state message, and button on a redesigned page must read as **plain language a non-developer/non-technical business user understands at a glance** — no engineering or dev-ops jargon.

Reference renames already made (reuse this vocabulary; don't reintroduce the jargon on the left):
- "Pipeline Stages" → Workflow Steps · "Document Ledger" → All Documents · "Secure Scanning" → Scan & Update
- "Audit Activity" → Activity Log · "Station Terminals" → QR Terminals · "Team Directory" → Team Members
- "Active Pipeline" / "Tracking Operations" → Live Tracking · "In-Flight Documents" → Documents on the Move
- "Predictive Analytics" → Forecast · "Workstation Congestion" → Office Busyness · "Bottleneck Risk" → Risk of Delay
- "SLA Compliance Rate" → On-Time Rate (KPI) / SLA Compliance (nav, already familiar as a business term — judgment call, not absolute)
- "Top Offices by Processing Speed" → Fastest Offices · "cycle time" → average time
- "Advance Status" → Update Status · "Planned Route" → Delivery Route

When touching a page's labels, also update its `useSeoMeta` title/description to match — don't leave the tab title jargon-y while the visible page is plain.

## Workflow

0. **No Figma access (rate-limited, no link, etc.) but a screenshot was given** — follow [references/screenshot-to-code.md](references/screenshot-to-code.md). It has the full process for turning a pasted screenshot into FlowVision code using this same design system, plus a library of component recipes (KPI stat cards, phase-accent kanban columns, the scroll-container fix, the real-data vertical stepper) already built this way — copy-adapt those instead of re-deriving from scratch.
1. **Big/whole-page redesigns** (a full dashboard, a new page layout): draft it first as an editable mockup using the `design` skill (Claude Design canvas), covering both light and dark mode, and get the user's approval before touching real code. Don't skip straight to implementation on large-scope visual changes.
2. **Small/targeted redesigns** (one component, one card, a color tweak): implement directly — no mockup needed.
3. **Never break functionality on a visual-only ask.** If the user says "just redesign the color/radius/labels," touch only that — don't restructure logic, props, or data flow. Read the component fully before editing so a "visual" change doesn't silently regress behavior.
4. **When implementing an approved mockup**, actually diff it against what's live — check chart colors (raw hex, see above), spacing, and structure, not just that the page "looks roughly similar." Several real gaps have been caught this way (stale indigo chart colors, a non-functional layout switcher, a decorative Filter button, tabs that updated state nobody read).
5. **Look for decorative-but-dead controls while you're in a component.** This codebase has a recurring pattern of buttons/tabs/filters that update local state but nothing reads it (the dashboard layout switcher, the Filter button, the Today/Yesterday/This week tabs, `routeStepClass` using a nonexistent `inject('summary')`). If a redesign touches a component with one of these, wire it up rather than just re-skinning it — a control that visibly does nothing is the opposite of "user-friendly."
6. **Master-detail / list+panel layouts** (a list next to a detail pane) must have both panels bounded to the same height with independent internal scrolling (`lg:h-[calc(100vh_-_Xrem)]`, `overflow-y-auto`, sticky detail panel) — never let a grid stretch a short panel to match a long list, which leaves dead empty space and loses the detail view on scroll.
7. **Mobile (Capacitor app)**: no fake OS chrome (status bar, keyboard), respect safe-area insets, minimum 44px touch targets, and prefer stacked/card layouts over tables at phone width.

## Non-Ionic note

Despite `@ionic/core` historically being a dependency, this app does not use Ionic components — it's a Tailwind/Vue UI wrapped by Capacitor. Design "native-feeling" mobile UI with Tailwind + CSS (safe-area insets, touch targets, platform conventions), not Ionic components, unless the user explicitly asks to adopt `@ionic/vue` for real.
