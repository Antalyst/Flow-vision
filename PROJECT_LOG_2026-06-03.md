# FlowVision Project Log - 2026-06-03

## Summary

Today the FlowVision client dashboard was updated with a new Offices Management Hub and fixed sidebar navigation so views switch inside the client layout instead of routing away.

## Offices Management Hub

- Rebuilt `app/components/userSide/clientSide/officeComp.vue` into a full office management interface.
- Added a responsive `max-w-[1800px] mx-auto` workspace layout.
- Added a rich-black, rich-orange, and white theme treatment.
- Added dark/light theme support using the existing `useTheme()` composable.
- Added a Settings panel with a dark/light toggle.
- Added a main offices datatable with:
  - Office ID
  - Office name
  - Assigned user full name
  - Stage name
  - Created date
  - Edit and delete actions
- Added create/edit sliding drawer forms.
- Added `v-model` bindings for:
  - `name`
  - `assigned_user`
  - `stage_id`
  - hidden `org_id`
- Added strict assigned-user filtering so only users with the same organization ID as the current user appear in the dropdown.
- Added local CRUD state for creating, editing, searching, and deleting offices.

## Sidebar Navigation Fix

- Updated `app/components/SidebarNav.vue` so sidebar buttons emit `change-tab`.
- Updated `app/layouts/client.vue` to store the active tab in local reactive state.
- Replaced the route slot rendering with Vue dynamic component rendering:
  - `dashboard` renders the client dashboard component.
  - `office` renders the Offices Management module.
  - `settings` renders a settings panel with the theme toggle.
  - Other tabs render themed placeholder cards.
- Added active state handling so the clicked sidebar item updates immediately.
- Kept mobile bottom navigation connected to the same tab switching logic.
- Added support for direct `/client/office` loading by initializing the Office tab from the route path.

## Dashboard Component Wrapper

- Added `app/components/userSide/clientSide/index.vue`.
- Moved the client dashboard UI into this component wrapper so it can be rendered directly by `layouts/client.vue`.
- Preserved existing dashboard sections:
  - Dashboard header
  - KPI cards
  - Document volume chart
  - Latest updates
  - Document table

## Layout Boundary

- Updated `app/layouts/client.vue` to enforce:

```html
w-full max-w-[1800px] mx-auto
```

This keeps the dashboard content within the required global application boundary.

## Verification

- Ran `npm run build` successfully after the Offices Management Hub changes.
- Ran `npm run build` successfully again after the sidebar navigation fix.
- Confirmed the local client route returned `200`:

```text
http://127.0.0.1:3000/client
```

## Notes

- Existing Nuxt/Supabase warnings still appear during build, but they are not caused by these changes.
- The warnings include the deprecated Supabase service key naming and missing generated database types.

## Client Role Architecture Refactor

- Refactored client-only UI into domain-driven folders:
  - `app/components/client/dashboard/`
  - `app/components/client/offices/`
  - `app/components/client/stages/`
- Added `app/components/client/org.vue` for client organization setup.
- Updated `app/layouts/client.vue` to import and render the new client component paths.
- Removed stale `userSide/clientSide` component usage from the active layout flow.
- Simplified `app/pages/client/index.vue` and `app/pages/client/office.vue` into layout shells because the client layout now controls the active module view.

## Layout Squeeze Fix

- Fixed the main client layout content area so it no longer contracts to a narrow width.
- Updated the main layout region to use:

```html
min-w-0 w-full flex-1
```

- Preserved the required global content boundary:

```html
w-full max-w-[1800px] mx-auto
```

## Office Schema Refinement

- Updated `app/components/client/offices/officeComp.vue`.
- Office creation is now decoupled from stages.
- Create/edit form fields are limited to:
  - `name`
  - `assigned_user`
- `stage_id` is initialized as `NULL` during office creation.
- Assigned-user options are loaded through:

```text
POST /api/users/getUserUnderOrg
```

- The request uses the current organization ID from the auth store so only staff from the same organization are listed.

## Stage Workflow Builder

- Added and wired `app/components/client/stages/stageComp.vue`.
- Stage creation supports:
  - `name`
  - `step_number`
- Added an interactive office-to-stage workflow builder.
- Offices can be reused across multiple stages as asynchronous milestones.
- Stage mapping now uses local stage-office sequence state instead of mutating `offices.stage_id`.
- Added drag-and-drop support from the available offices list into stage containers.
- Added up/down controls for desktop and mobile-friendly reordering.
- Reordering immediately recalculates each mapped office sequence `step_number`.
- Used FlowVision theme tokens for interaction states:
  - `rich-orange` for active borders, buttons, handles, and drop zones.
  - `rich-black` for dark mode panels.
  - White and gray surfaces for light mode.

## Store Refactor

- Rewrote `app/stores/office.ts` as a clean Pinia CRUD store for offices.
- Added `app/stores/stage.ts` as a clean Pinia CRUD store for stages and local stage-office sequencing.
- Removed malformed `app/stores/register.vue`.
- Kept `app/stores/employeeAuth.ts` because `app/layouts/default.vue` still depends on it.

## Latest Verification

- Ran `npm run build` successfully after the refactor.
- Confirmed the client route returned `200`:

```text
http://127.0.0.1:3000/client
```
