        # FlowVision — System Architecture Guide

        > **Status:** Living reference document. Maintained by Engineering.
        > **Scope:** Full-stack integration map covering the Nuxt 3 frontend, Pinia state layer, Nitro server routes, and the Supabase PostgreSQL schema.

        FlowVision is an AI-powered document monitoring framework. It pairs a client-facing operational workspace (dashboard, offices, sequential stage pipelines) with a server-side retrieval layer that hydrates document metadata from Supabase and binary content from a secondary MySQL store before passing context to an LLM.

        This document is the canonical reference for how a request flows from a Vue component, through a Pinia store, into a Nitro API route, and finally to the database — and back.

        ---

        ## 1. Project Overview & Boundaries

        | Attribute | Value |
        | --- | --- |
        | Product name | FlowVision |
        | Category | AI-Powered Document Monitoring Framework |
        | Frontend framework | Nuxt 3 / Vue 3 (Composition API, `<script setup>`) |
        | Server runtime | Nitro (Nuxt server routes under `server/api`) |
        | Primary database | Supabase (PostgreSQL) |
        | Secondary store | MySQL (Hostinger cluster) for document binary blobs |
        | State management | Pinia (`app/stores`) |
        | Styling | Tailwind CSS with custom design tokens |
        | AI / RAG | Groq SDK + custom text-to-query and formatter utilities |

        ### Design boundaries

        > **Layout rule:** The application is constrained to a global maximum width of `1800px`, centered via `max-w-[1800px] mx-auto`. The Tailwind `container` is configured so the `2xl` breakpoint resolves to `1800px`, keeping desktop layouts from sprawling on ultra-wide displays while remaining fully responsive down to mobile shell viewports.

        > **Theme rule:** Dark mode is class-based (`darkMode: 'class'`). The active theme is toggled through the `useTheme()` composable, persisted in `localStorage` under `flowvision-theme`, and applied by adding/removing the `dark` class on `document.documentElement`.

        ### Brand design tokens

        These are defined in `tailwind.config.js` and used consistently across the client workspace.

        | Token | Hex | Usage |
        | --- | --- | --- |
        | `rich-black` | `#121212` | Primary dark-mode background |
        | `rich-orange` | `#FF620C` | Primary accent — buttons, active borders, drag handles, step badges |
        | `primary-btn` | `#F77934` | Secondary button accent |
        | `card-dark` | `#1A1A1A` | Dark-mode card/surface background |
        | `card-border` | `#2A2A2A` | Dark-mode borders |
        | `surface` | `#F9F9F9` | Light-mode app background |
        | `sidebar-dark` | `#161616` | Dark-mode sidebar background |
        | `heading-dark` | `#1D1D1D` | Light-mode heading text |
        | `muted` | `#A0A0A0` | Muted/secondary text |

        Typography uses `Inter` (`font-dashboard`) for the workspace UI and `Afacad` (`font-primary`) for marketing/primary surfaces.

        ---

        ## 2. Frontend Directory Structure & Component Flow

        FlowVision follows a **domain-driven component architecture**. Client-facing modules live under `app/components/client/<domain>/`, and the active workspace tab is resolved dynamically inside `app/layouts/client.vue`.

        ```
        app/
        ├── layouts/
        │   └── client.vue              # Shell: sidebar, mobile nav, dynamic tab → component map
        ├── components/
        │   └── client/
        │       ├── dashboard/          # Analytics workspace
        │       │   ├── index.vue           # Composition root (KPIs + chart + tables)
        │       │   ├── DashboardHeader.vue
        │       │   ├── KpiCard.vue         # KPI metric card with sparkline
        │       │   ├── DocumentVolumeChart.vue
        │       │   ├── LatestUpdates.vue
        │       │   └── DocumentTable.vue
        │       ├── offices/
        │       │   └── officeComp.vue      # Standalone office registration + user assignment
        │       └── stages/
        │           └── stageComp.vue       # Sequential pipeline builder (drag-and-drop)
        ├── stores/                     # Pinia layer (see §3)
        └── composables/
        └── useTheme.ts             # Dark/light theme state
        ```

        ### Tab resolution

        > **Architectural rule:** `app/layouts/client.vue` owns navigation. It maps a `currentTab` key to a concrete component through a `tabComponents` lookup (`dashboard → DashboardView`, `office → OfficeView`, `stages → StageView`, plus inline placeholder/settings components). Because these views are mounted dynamically, **each domain component is responsible for triggering its own data fetch in `onMounted`** rather than relying on a route-level loader.

        ### `components/client/dashboard/`

        The dashboard composition root (`index.vue`) assembles the analytics workspace:

        - **`KpiCard.vue`** — KPI tracking cards (Total Documents, Processing Speed, SLA Compliance Rate) rendered with trend deltas and inline sparkline data.
        - **`DocumentVolumeChart.vue`** — the translucent gradient volume-trend chart visualizing document throughput over time.
        - **`LatestUpdates.vue`** — a feed of the most recent document status changes.
        - **`DocumentTable.vue`** — the latest document status table.

        ### `components/client/offices/`

        `officeComp.vue` handles **standalone office registration** and **automated organizational user assignment**:

        - A directory table lists offices scoped to the active organization.
        - A sliding drawer hosts the create/edit form (office `name` + `assigned_user`).
        - The **Assigned User** dropdown is populated exclusively with employees from the same organization, fetched on drawer open.
        - Office creation is **decoupled from stages** — `stage_id` is initialized as `NULL`.

        ### `components/client/stages/`

        `stageComp.vue` controls the **sequential pipeline workspace** with a drag-and-drop ordering builder:

        - A left **Available Offices** pool can be clicked or dragged into a route sequence.
        - The **Create Stage** drawer builds a local `selectedWorkflowOffices` array; step numbers are **computed automatically** from list order (no manual step input).
        - Items can be reordered (drag, or up/down controls); each reorder recomputes `step_number = index + 1`.
        - On save, the stage header and its ordered office steps are submitted together as one payload.

        ---

        ## 3. State Management (Pinia Layer)

        State is partitioned by domain inside `app/stores/`. Stores own all `$fetch` calls; components never call the API directly.

        | Store | Responsibility | Backend surface |
        | --- | --- | --- |
        | `auth.ts` | Session, user identity, organization scope (`org_id`) | `/api/auth/*`, `/api/org/*` |
        | `office.ts` | Office CRUD + assignable employee list | `/api/office`, `/api/users/getUserUnderOrg` |
        | `stage.ts` | Stage CRUD + local drag-and-drop sequence state | `/api/stages` |

        ### `auth.ts`

        Tracks the active client auth session and organizational scope.

        - **State:** `user`, `token` (both hydrated from cookies `auth_user` / `auth_token`), `loading`, `currentOrg`.
        - **Key getters:** `isLoggedIn`, `userRole`, `needsOrgSetup` (true when a `client` has no `org_id` yet).
        - **Key actions:** `login`, `register`, `logout`, `createOrg`, and `fetchMyOrg` (resolves the org record via `POST /api/org/getorg`).

        > **Scope rule:** `org_id` is the universal tenancy boundary. Every office/stage/employee query is filtered by the active organization's `org_id`, sourced from `currentOrg?.org_id ?? user?.org_id`.

        ### `office.ts`

        Pure CRUD state tracking against `/api/office` plus the employee lookup.

        - **State:** `offices`, `usersUnderOrg`, `loading`.
        - **Org-id getters:** exposes both `currentOrgId` (numeric, used for legacy numeric ids) and `currentOrgIdRaw` (string, the canonical value sent to the API). The raw string form avoids `NaN` coercion when ids are UUIDs.
        - **Actions:** `fetchOffices`, `createOffice`, `updateOffice`, `deleteOffice`, `fetchUsersUnderOrg`.

        > **Consistency rule:** The store always sends `org_id` as the raw string form (`currentOrgIdRaw`) so the value matches the database column regardless of whether ids are integers or UUIDs.

        ### `stage.ts`

        Manages stage records **and** the local reactive workspace state used to build sequences before persistence.

        - **State:** `stages`, `stageOfficeSequences` (a `Record<stage_id, StageOfficeSequenceItem[]>`), `loading`.
        - **Local sequence actions** (no network): `addOfficeToStage`, `removeOfficeFromStage`, `moveOfficeInStage`, `recalculateOfficeSequence`. These mutate the in-memory drag-and-drop ordering and keep `step_number` contiguous.
        - **Persistence actions:** `fetchStages` (hydrates `stageOfficeSequences` from the API response), `createStage` (submits header + `workflow_items`), `updateStage`, `deleteStage`, `reorderStages`.

        > **Builder rule:** The drag-and-drop ordering is a **client-side draft** held in `stageOfficeSequences`. It is only committed to the database when the user submits the Create Stage form; reads re-hydrate this map from the server so the UI reflects persisted truth after refresh.

        ---

        ## 4. Backend Server Routing (Nitro API Layer)

        All routes live under `server/api/`. Routes use the Supabase server client (`serverSupabaseClient(event)`) or the service-role client (`createClient` with `config.supabaseServiceKey`) depending on whether elevated access is required.

        ### Endpoint map

        | Method & Route | Purpose |
        | --- | --- |
        | `POST /api/auth/login` | Verify credentials (bcrypt) and return user + session token |
        | `POST /api/auth/register` | Create user; resolve `org_id` from org code for employees |
        | `POST /api/auth/logout` | Clear server session |
        | `POST /api/org` | Create an organization and link it to the creating user |
        | `POST /api/org/getorg` | Resolve the organization record for a `user_id` |
        | `POST /api/users/getUserUnderOrg` | Return employees scoped to an `org_id` |
        | `GET /api/office` | List offices for an `orgId` |
        | `POST /api/office` | Create an office |
        | `PUT /api/office` | Update an office |
        | `DELETE /api/office` | Delete an office |
        | `GET /api/stages` | List stages + their `workflow_items` for an `orgId` |
        | `POST /api/stages` | Create a stage header + bulk-insert workflow steps |
        | `PUT /api/stages` | Update a stage |
        | `DELETE /api/stages` | Delete a stage (and its steps) |
        | `POST /api/rag/query` | RAG: text-to-query → Supabase metadata → MySQL blob hydration → LLM |
        | `POST /api/documents/upload` | Persist a document record |

        ### `POST /api/users/getUserUnderOrg`

        Receives an `org_id` in the request body and returns the **assignable employee pool**.

        ```
        SELECT user_id, full_name, email, role, org_id
        FROM users
        WHERE org_id = :org_id
        AND role = 'employee'
        ORDER BY full_name ASC
        ```

        > **Filtering rule:** The route strictly filters `role = 'employee'`. Clients/owners are never returned in the assignment dropdown. The handler accepts `org_id` (canonical) with a fallback to `orgId` for backward compatibility.

        **Response shape:**

        ```json
        { "success": true, "data": [ { "user_id": "...", "full_name": "...", "email": "...", "role": "employee", "org_id": "..." } ] }
        ```

        ### `GET /api/office` & `POST /api/office`

        Independent department office record CRUD.

        - **`GET`** requires an `orgId` query parameter and returns offices ordered by `created_at DESC`.
        - **`POST`** requires `name`, `user_id` (mapped to `assigned_user`), and `org_id`. `stage_id` defaults to `NULL`, preserving office/stage decoupling.

        > **Decoupling rule:** Offices are first-class records that exist independently of any stage. The office → stage relationship is expressed only through the `stage_steps` bridge table (see §5), never by mutating the office row.

        ### `POST /api/stages`

        Processes **multi-row relational transactional logic**. This is the most complex write path in the system.

        **Request payload:**

        ```json
        {
        "stage_name": "Quality Review",
        "org_id": "current-client-org-uuid",
        "workflow_items": [
        { "office_id": "uuid-1", "step_number": 1 },
        { "office_id": "uuid-2", "step_number": 2 }
        ]
        }
        ```

        **Execution sequence:**

        1. Validate `stage_name`, `org_id`, and that `workflow_items` is an array.
        2. Resolve the next stage ordering position by reading the current max `step_number` for the org.
        3. Insert the **parent header row** into `stages` and retrieve the generated `stage_id`.
        4. Map over `workflow_items`, building one row per step (`stage_id`, `office_id`, `step_number`, `org_id`).
        5. **Bulk insert** those rows into the `stage_steps` bridge table.
        6. If the step insert fails, **roll back** by deleting the orphaned parent stage, then surface the error.

        > **Transaction rule:** Because Supabase REST inserts are not wrapped in a single SQL transaction here, the route enforces atomicity manually: a failed `stage_steps` insert deletes the just-created parent `stages` row so no orphaned header is left behind. All failures log `[Backend Stage Error]:` and return a non-2xx status for inspection in the network tab.

        **Response shape:**

        ```json
        {
        "status": 201,
        "success": true,
        "message": "Stage created successfully",
        "data": { "stage": { "stage_id": "...", "name": "...", "step_number": 1 }, "workflow_items": [ ... ] }
        }
        ```

        ### RAG / document layer (context)

        `POST /api/rag/query` demonstrates the **hybrid datastore** design: a natural-language prompt is converted into structured query filters, document metadata is searched in Supabase (scoped by `org_id`), and the physical file text is hydrated from the MySQL blob store before being formatted and passed to the Groq LLM.

        ---

        ## 5. Relational Database Schema Mapping (Supabase / PostgreSQL)

        > **Tenancy rule:** `org_id` is present on every operational table and is the enforced boundary for all reads and writes. No cross-organization data is ever returned.

        ### `public.users`

        Core identity and role record.

        | Column | Type | Notes |
        | --- | --- | --- |
        | `user_id` | UUID | Primary key |
        | `full_name` | text | Display name |
        | `email` | text | Login identifier (unique) |
        | `role` | text | `client` or `employee` |
        | `org_id` | UUID | Organization scope (nullable until org setup) |
        | `acctype_id` | UUID | FK → `account_types` |
        | `password` | text | bcrypt hash |
        | `status` | int | Account status flag |

        ### `public.offices`

        A standalone department/office, independent of stages.

        | Column | Type | Notes |
        | --- | --- | --- |
        | `id` | UUID | Primary key |
        | `name` | text | Office name |
        | `assigned_user` | UUID | FK → `users.user_id` |
        | `org_id` | UUID | FK → `org.org_id` |
        | `stage_id` | UUID / null | Nullable; offices are decoupled from stages |
        | `created_at` | timestamptz | Creation timestamp |

        **Relationships:** `offices.assigned_user → users.user_id`, `offices.org_id → org.org_id`.

        ### `public.stages`

        Parent workflow metadata (the stage "header").

        | Column | Type | Notes |
        | --- | --- | --- |
        | `stage_id` | UUID | Primary key |
        | `name` | text | Stage name |
        | `step_number` | int | Stage ordering position within the org |
        | `org_id` | UUID | FK → `org.org_id` |
        | `created_at` | timestamptz | Creation timestamp |

        ### `public.stage_steps`

        The relational **sequence bridge table**. Each row is one office occupying one ordered position within a stage's workflow.

        | Column | Type | Notes |
        | --- | --- | --- |
        | `stage_step_id` | BIGINT (identity) | Primary key |
        | `stage_id` | UUID | FK → `stages.stage_id` (cascade on delete) |
        | `office_id` | UUID | FK → `offices.id` |
        | `step_number` | int | Sequential position index within the stage |
        | `org_id` | UUID | FK → `org.org_id` (tenancy boundary) |
        | `created_at` | timestamptz | Creation timestamp |

        > **Bridge rule:** An office may appear in multiple stages, and the same office may even appear more than once within a stage's sequence. Ordering is owned by `stage_steps.step_number`, not by the office record. Deleting a stage cascades to its `stage_steps` rows (handled in `DELETE /api/stages`).

        ### Suggested DDL

        ```sql
        CREATE TABLE public.stage_steps (
        stage_step_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        stage_id      UUID NOT NULL REFERENCES public.stages(stage_id) ON DELETE CASCADE,
        office_id     UUID NOT NULL REFERENCES public.offices(id),
        step_number   INTEGER NOT NULL,
        org_id        UUID NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_stage_steps_stage_id ON public.stage_steps(stage_id);
        CREATE INDEX idx_stage_steps_org_id   ON public.stage_steps(org_id);
        ```

        ---

        ## 6. End-to-End Data Flow Example — Creating a Stage

        ```
        User builds route sequence in stageComp.vue
                │  (local draft: selectedWorkflowOffices, auto step_number)
                ▼
        stageStore.createStage({ stage_name, workflow_items })
                │  attaches org_id from currentOrgIdRaw
                ▼
        POST /api/stages  (Nitro)
                │  1. validate  2. compute next step_number
                │  3. insert stages (header) → stage_id
                │  4. bulk insert stage_steps (one row per office)
                │  5. rollback header if steps fail
                ▼
        Supabase: stages + stage_steps written atomically (manual rollback guard)
                ▼
        Response { status: 201, data: { stage, workflow_items } }
                ▼
        Store pushes stage into `stages` and sets stageOfficeSequences[stage_id]
                ▼
        stageComp.vue closes drawer, clears selectedWorkflowOffices
        ```

        ---

        ## 7. Architectural Rules — Quick Reference

        > 1. **Stores own I/O.** Components never call `$fetch` directly; they call store actions.
        > 2. **`org_id` is the tenancy boundary** on every operational read/write.
        > 3. **Send `org_id` as a raw string** to avoid numeric/UUID coercion mismatches.
        > 4. **Offices are decoupled from stages**; the relationship lives only in `stage_steps`.
        > 5. **Stage step ordering is derived from list order** (`index + 1`), never manual input.
        > 6. **Dynamic views fetch on mount** because the client layout mounts them dynamically.
        > 7. **Stage writes are manually atomic** — a failed step insert rolls back the parent header.
        > 8. **All server errors log a tagged message and return a non-2xx status** for network-tab inspection.
