-- ============================================================================
-- FlowVision — Recurring Document Routing
-- Run manually in the Supabase SQL editor. Additive only; safe to re-run.
-- Prerequisite: document_route_stops (created for the route-builder release).
--
-- Design: a routing cycle is a contiguous range of route steps. The step
-- counter (documents.current_step) only ever increases, so cycle 2 simply
-- continues after cycle 1 (e.g. cycle 1 = steps 1–3, cycle 2 = steps 4–6).
-- Existing pickup / receipt / release / liaison logic works unchanged, and
-- the existing unique (document_id, step_number) on route stops stays valid.
-- ============================================================================

-- 1. Routing type per document. Existing documents become 'STANDARD' (unchanged behaviour).
alter table public.documents
  add column if not exists routing_type text not null default 'STANDARD';

-- 2. Saved routes can remember whether they are recurring.
alter table public.stages
  add column if not exists routing_type text not null default 'STANDARD';

-- 3. Which cycle each route stop belongs to, and whether it is the automatic
--    "return to the creator's office" stop that ends a recurring cycle.
--    Existing stops become cycle 1, not a return stop.
alter table public.document_route_stops
  add column if not exists cycle_number integer not null default 1;
alter table public.document_route_stops
  add column if not exists is_return boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_routing_type_chk') then
    alter table public.documents add constraint documents_routing_type_chk
      check (routing_type in ('STANDARD', 'RECURRING'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stages_routing_type_chk') then
    alter table public.stages add constraint stages_routing_type_chk
      check (routing_type in ('STANDARD', 'RECURRING'));
  end if;
end $$;

-- 4. One row per routing cycle of a recurring document.
create table if not exists public.document_routing_cycles (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  org_id        uuid not null references public.org(org_id),
  cycle_number  integer not null check (cycle_number >= 1),
  start_step    integer not null,
  end_step      integer not null,
  status        text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED')),
  started_by    uuid references public.users(user_id) on delete set null,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  completed_by  uuid references public.users(user_id) on delete set null,
  constraint document_routing_cycles_number_uq unique (document_id, cycle_number)
);
-- At most one active cycle per document: blocks duplicate / concurrent reactivation.
create unique index if not exists document_routing_cycles_one_active
  on public.document_routing_cycles (document_id) where status = 'ACTIVE';
alter table public.document_routing_cycles enable row level security;  -- server (service role) only

-- ── Verify ───────────────────────────────────────────────────────────────
-- select column_name, data_type, column_default from information_schema.columns
--  where table_schema = 'public'
--    and ((table_name = 'documents' and column_name = 'routing_type')
--      or (table_name = 'stages' and column_name = 'routing_type')
--      or (table_name = 'document_route_stops' and column_name in ('cycle_number', 'is_return')));
-- select count(*) from public.document_routing_cycles;   -- 0 right after running
--
-- ── Rollback (manual only; loses cycle history of recurring documents) ──
-- drop table public.document_routing_cycles;
-- alter table public.document_route_stops drop column is_return, drop column cycle_number;
-- alter table public.stages drop constraint stages_routing_type_chk, drop column routing_type;
-- alter table public.documents drop constraint documents_routing_type_chk, drop column routing_type;
