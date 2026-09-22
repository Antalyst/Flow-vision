# Screenshot-to-code playbook (no Figma access required)

This file exists so redesign work can continue even when the Figma MCP
tools are unavailable (rate-limited, no link given, etc.) — a pasted
**screenshot** plus this playbook plus [../SKILL.md](../SKILL.md) (the
FlowVision design system: colors, radius, typography, wording) is enough
to reproduce a design faithfully in this codebase.

Read `../SKILL.md` first — it has the tokens and wording rules. This file
is the *process* for turning pixels into FlowVision code, plus a library
of component recipes already built this way, so new work can copy-adapt
instead of re-deriving from scratch.

## The process

1. **Identify the target.** Which route/component is being redesigned?
   If it's not obvious from the screenshot or the request, ask. Don't
   guess and redesign the wrong file.

2. **Read the current implementation in full before touching anything.**
   Every prop, every computed, every API call. A screenshot only shows
   the happy-path visual state — the loading state, empty state, error
   state, and every interactive control (buttons, forms, realtime
   subscriptions) still have to work after the redesign. You cannot know
   what's safe to change without reading what's there first.

3. **Map every visible element to a real data source.** Never hardcode
   or invent the content a screenshot shows (names, counts, timestamps).
   For each piece of text/number in the mock, find where it already
   comes from in the current script (a prop, a store, a computed). If
   the design shows something the current data model doesn't have yet
   (e.g. "picked up by X at 10:29 AM"), **search `server/api/` for an
   endpoint that already returns it** before inventing a fake field or
   writing placeholder copy. This app usually already has the endpoint —
   it's just not wired into this particular component yet.
   - Worked example: the drawer redesign needed per-checkpoint
     pickup/arrival timestamps and courier names. Instead of fabricating
     them, we found `/api/tracking/timeline` already computed exactly
     that (it was built for `client/current-working.vue`) and wired the
     drawer to fetch it. Real data, zero backend changes.

4. **Translate structure into Tailwind using existing tokens only.**
   Never write a new hex value. Match every color/radius/spacing you see
   to the nearest token in `tailwind.config.js` per `../SKILL.md`. If a
   screenshot's color doesn't map cleanly onto an existing token (e.g. a
   4th "not started yet" tier that's amber, sitting between the design
   system's gray/orange/green 3-tier default), it's fine to reuse an
   *existing* semantic token for it (here: `warning`, already defined)
   rather than inventing a new one — see "Status tiering" below.

5. **Reuse existing patterns before inventing new ones.** Grep the
   codebase for a component that already does something close to what
   the screenshot shows (a stat card, a stepper, a badge) and match its
   conventions: the `isDark` computed + `mutedClass`/`headingClass`
   naming, the `.stagger-block` + GSAP entrance-animation pattern, the
   `isDark.value ? '...' : '...'` inline class-ternary style used
   everywhere instead of a CSS-in-JS theme object. Consistency with the
   rest of the file beats a "cleaner" pattern imported from nowhere.

6. **Never silently drop functionality that isn't pictured.** A
   screenshot is a static mock of one state — it won't show a manual
   refresh button, a realtime alert banner, or a conditional action that
   only appears for certain document statuses. Before deleting anything
   the old markup had that isn't in the new mock, decide on purpose:
   - Purely decorative and superseded by the new design → drop it.
   - Functional (fetches data, mutates state, triggers a side effect) →
     keep it, just restyle it to fit the new look, and say so in your
     summary rather than deleting it quietly.
   - Worked example: the KPI-card/kanban redesign dropped the old
     "Live Tracking" summary strip (superseded by the new stat cards)
     but kept the Sync button and the realtime inbound-dispatch banner,
     because those still do real work.

7. **Check blast radius before redesigning a shared component.** Grep
   for every usage of the component first (`Grep` for the component
   name across `app/`). If it's used in five places, the redesign
   changes it in all five — that's usually fine (the design system
   wants one consistent look app-wide) but say so explicitly rather than
   assuming it's scoped to the one page the user was looking at.
   - Worked example: `DocumentPreviewDrawer.vue` is used by both the
     employee and client portals plus flagged-documents. Redesigning it
     for the "Current Working" drawer mock changed it everywhere, which
     was the right call — but it was called out, not assumed.

8. **Clean up after yourself.** After replacing markup, grep the file
   for now-dead helper functions/computeds the old markup used (a
   `truncateId`, a `stepLabelClass`, an unused `colIdx` loop variable)
   and remove them. A redesign that leaves orphaned dead code behind
   isn't finished.

## Reading a screenshot without exact metrics

Figma's `get_design_context` normally hands over exact pixel values and
hex codes. A plain screenshot doesn't. Estimate by matching to the
app's own scales instead of eyeballing arbitrary numbers:

- **Spacing**: FlowVision content uses the standard Tailwind 4px scale
  (`gap-1`=4px … `gap-6`=24px). Most card padding in this app is `p-4`
  or `p-5`; section gaps are `gap-4`/`gap-5`/`gap-6`. If a gap in the
  screenshot looks "about one card-padding wide," it almost always is.
- **Radius**: this app has exactly three tiers (see `../SKILL.md`) —
  `rounded-full` (pills/avatars/dots), `rounded-xl` (buttons, inputs,
  small cards, 12px), `rounded-card`/`rounded-2xl` (large panels, 14–16px).
  Match the screenshot's corner softness to one of these three; don't
  introduce a fourth.
- **Color**: never sample a hex value from the image. Decide which
  *semantic* token the element represents (brand accent, success,
  warning, danger, muted text, card surface, page canvas) and use that
  token. If dark-mode-only reference art doesn't show a light-mode
  equivalent, derive it by applying the same semantic token through the
  light-mode side of the app's existing `isDark ? '...' : '...'` pairs
  elsewhere in the same file/portal — don't leave light mode unstyled.
- **Copy**: match the design's plain-English wording rules from
  `../SKILL.md` (no dev jargon). If a label in the screenshot is more
  technical than the app's established vocabulary, prefer the app's
  existing term over the screenshot's literal text.

## Status tiering (the recurring "how many colors" question)

Default to the Shopee-style 3-tier system in `../SKILL.md`: gray = not
started, brand orange = in progress, green = done. If a screenshot adds
a 4th tier for "pending/not-yet-picked-up" distinct from "not started,"
that's a legitimate refinement — reuse the existing `warning` (amber)
token for it rather than inventing a new color. Don't add a 5th.

## Scroll containers: the flex/grid `min-height: auto` trap

Recurring bug: a card list inside a flex/grid column keeps growing to
fit all its content instead of scrolling internally, even with
`overflow-y-auto` and a `flex-1` parent. Cause: flex/grid items default
to `min-height: auto`, which sizes them to their content's natural
height and defeats `flex-1`/shrinking — `overflow-y-auto` never gets a
bounded box to actually clip against.

**Reliable fix** (used both here and in `client/current-working.vue`):
give the *scrolling element itself* an explicit height via
`h-[calc(100vh-Xrem)]`, not just `flex-1` + `overflow-y-auto`. Apply it
at the breakpoint where the multi-column layout kicks in (so mobile,
which stacks to one column, keeps scrolling the whole page instead of
being squeezed into a short fixed box). Tune `Xrem` by adding up
everything above the scroll container (header, KPI/stat row, column
header, page padding) — err generous; a little extra empty space at the
bottom of a short column is far less broken than a column that won't
scroll at all.

```html
<div class="overflow-y-auto sm:h-[calc(100vh-25rem)]">
  <!-- long card list -->
</div>
```

Don't reach for `min-h-0` scattered across every ancestor as the fix —
it's fragile (grid-item stretch behavior is inconsistent across
browsers) and harder to reason about than a single explicit height on
the element that actually needs to clip.

## Component recipe library

Concrete, already-shipped examples to copy-adapt rather than re-derive.
Each entry is real code in this repo, not a template.

### KPI stat card (icon + big number + label)

`app/pages/employee/working.vue` — the "KPI Stat Cards" section.
Icon top-left, big bold number beside it, label below, in a
`rounded-card` bordered surface with `shadow-card`. Grid of 2 (mobile)
→ 4 (desktop) columns.

### Kanban column with a phase-accent system + independent scroll

`app/pages/employee/working.vue` — the "Kanban Board" section.
Pattern: a pill-style column header (icon + label + count, no border
box), a card list below it using the `h-[calc(100vh-Xrem)]` scroll fix
above, and cards with a 4px colored accent bar on the left edge (an
absolutely-positioned `span` inside an `overflow-hidden rounded-xl`
card) whose color comes from a small `PHASE_ACCENT` lookup keyed by
pipeline phase — one source of truth for the tier color instead of
repeating ternaries at every usage site.

### Vertical "delivery progress" stepper sourced from real timeline data

`app/components/documents/DocumentPreviewDrawer.vue` — the "Delivery
Progress" section. Circle-and-connector-line stepper (done = filled
green check, current = filled orange with a `ring-4 ring-candy-orange/20`
halo — a solid ring, not a blurred glow, so it's allowed under the
"no glow" rule — upcoming = outlined gray with the step number). Each
step's person/time lines are computed in a single `stepsDisplay`
computed that enriches the raw route-step data with
`statusLabel`/`statusClass`/`actorLine`/`timeLine`, fetched from
`/api/tracking/timeline` (see step 3 above) rather than the lighter
`stageStore.stageOfficeSequences` the old version used.

### Horizontal variant of the same stepper (pre-existing, for reference)

`app/components/client/tracking/DocumentTimeline.vue` — a horizontal
left-to-right version of the same real-timeline-data stepper pattern,
built before this session. Good reference for the `routeStepClass`-style
done/current/upcoming color logic if a horizontal layout is ever needed
again.

## Judgment calls to flag rather than silently make

These come up on nearly every redesign and are genuinely the user's
call, not something to decide unilaterally:

- Dropping a data field/badge that's real and currently displayed
  (e.g. uploader name, reference ID) because the new mock doesn't show
  it — say what you're dropping and why, don't just omit it.
- Redesigning a shared component that's used in multiple places.
- Adding a new backend field/endpoint change to satisfy a design detail
  — prefer finding an existing endpoint (step 3) over modifying the
  server; if no existing endpoint has the data, flag it instead of
  fabricating the display value.
