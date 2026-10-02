-- ============================================================================
-- FlowVision — Allow the workflow's tracking event types
-- Run manually in the Supabase SQL editor. Safe to re-run.
--
-- Problem: the live table document_tracking_events has a CHECK constraint
-- named tracking_event_type_check on event_type. Its definition is not in
-- this repository (it was created directly in the database), and it rejects
-- the event types the custody / liaison / release workflow writes, e.g.
--   new row for relation "document_tracking_events" violates check
--   constraint "tracking_event_type_check"
--
-- What this does (one transaction — all or nothing):
--   1. Reads the CURRENT constraint definition and keeps every value it allows.
--   2. Keeps every event_type value already stored in the table.
--   3. Adds every event type the application writes (list below — the same
--      list as TRACKING_EVENT_TYPES in server/utils/documentAccess.ts).
--   4. Re-creates tracking_event_type_check with exactly that list.
--      It still rejects any other value — it is NOT made permissive.
--      NULL handling is unchanged: NULL stays allowed unless the old
--      definition required IS NOT NULL, in which case that is kept.
--
-- It does NOT delete or update any row, and touches no other constraint,
-- table or column (documents, QR codes, route stops and cycles are untouched).
-- ============================================================================

begin;

do $$
declare
  old_def      text;
  old_values   text[] := '{}';
  stored       text[] := '{}';
  required     text[] := array[
    -- liaison delivery
    'LIAISON_PICKUP', 'IN_TRANSIT', 'RECEIVED_BY_OFFICE',
    -- custody inside an office
    'CUSTODY_TRANSFER',
    -- office-head release / completion
    'RELEASE_REQUESTED', 'RELEASE_APPROVED', 'RELEASE_REJECTED', 'DOCUMENT_COMPLETED',
    -- recurring routing
    'CYCLE_STARTED', 'CYCLE_COMPLETED', 'CYCLE_RECORD_REPAIRED',
    -- discrepancy reporting
    'DISCREPANCY_REPORTED', 'DISCREPANCY_RESOLVED'
  ];
  final_values text[];
  keep_not_null boolean := false;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'document_tracking_events' and column_name = 'event_type'
  ) then
    raise exception 'public.document_tracking_events.event_type does not exist — nothing to fix here. Run 2026-10-02_tracking_event_details.sql first.';
  end if;

  select pg_get_constraintdef(c.oid)
    into old_def
    from pg_constraint c
   where c.conrelid = 'public.document_tracking_events'::regclass
     and c.conname = 'tracking_event_type_check'
     and c.contype = 'c';

  if old_def is not null then
    -- Refuse to guess if the constraint is about something other than event_type.
    if old_def !~* 'event_type' then
      raise exception 'tracking_event_type_check does not reference event_type (%). Stopping without changes.', old_def;
    end if;
    -- Every allowed value in the old definition. Postgres shows a value list
    -- either as separate literals  (ARRAY['CREATED'::text, 'SCAN'::text]  or
    -- IN ('CREATED', ...))  or as one array literal  ('{CREATED,SCAN}'::text[]);
    -- both forms are read.
    select coalesce(array_agg(distinct trim(both '"' from part)), '{}')
      into old_values
      from (select replace(m[1], '''''', '''') as lit
              from regexp_matches(old_def, '''((?:[^'']|'''')*)''', 'g') as m) l
      cross join lateral unnest(
        case when l.lit like '{%}' then string_to_array(trim(both '{}' from l.lit), ',')
             else array[l.lit] end
      ) as part
     where part is not null and part <> '';
    keep_not_null := old_def ~* 'event_type\s+is\s+not\s+null';
    raise notice 'Old definition: %', old_def;
  else
    raise notice 'tracking_event_type_check did not exist — creating it.';
  end if;

  select coalesce(array_agg(distinct event_type), '{}')
    into stored
    from public.document_tracking_events
   where event_type is not null;

  select array_agg(v order by v)
    into final_values
    from (select distinct unnest(old_values || stored || required) as v) s
   where v is not null and v <> '';

  if old_def is not null then
    alter table public.document_tracking_events drop constraint tracking_event_type_check;
  end if;

  -- Written as ARRAY['A', 'B', ...] so every value stays a separate, readable literal.
  execute format(
    'alter table public.document_tracking_events add constraint tracking_event_type_check check (%s event_type = any (array[%s]::text[]))',
    case when keep_not_null then 'event_type is not null and' else '' end,
    (select string_agg(quote_literal(v), ', ' order by v) from unnest(final_values) as v)
  );

  raise notice 'Kept from old constraint: %', array_to_string(old_values, ', ');
  raise notice 'Already stored in the table: %', array_to_string(stored, ', ');
  raise notice 'Now allowed: %', array_to_string(final_values, ', ');
end $$;

commit;

-- PostgREST: make sure the API sees the current schema.
notify pgrst, 'reload schema';

-- ── Verification (read-only) ────────────────────────────────────────────────
-- 1. The final constraint definition:
-- select conname, pg_get_constraintdef(oid) as definition
--   from pg_constraint
--  where conrelid = 'public.document_tracking_events'::regclass and contype = 'c'
--  order by conname;
--
-- 2. Every event type the app writes is allowed — expect 13 rows, all "true":
-- select t.event_type,
--        t.event_type = any (
--          (select array_agg(m[1]) from pg_constraint c,
--                  regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') as m
--            where c.conrelid = 'public.document_tracking_events'::regclass
--              and c.conname = 'tracking_event_type_check')
--        ) as allowed
--   from unnest(array['LIAISON_PICKUP','IN_TRANSIT','RECEIVED_BY_OFFICE','CUSTODY_TRANSFER',
--                     'RELEASE_REQUESTED','RELEASE_APPROVED','RELEASE_REJECTED','DOCUMENT_COMPLETED',
--                     'CYCLE_STARTED','CYCLE_COMPLETED','CYCLE_RECORD_REPAIRED',
--                     'DISCREPANCY_REPORTED','DISCREPANCY_RESOLVED']) as t(event_type);
--
-- 3. The constraint still rejects unknown values — run inside a transaction
--    that is rolled back, so nothing is written:
-- begin;
--   insert into public.document_tracking_events (document_id, org_id, status, event_type, notes)
--   values (gen_random_uuid(), 'verification', 'CREATED', 'NOT_A_REAL_EVENT', 'verification');
--   -- expected: ERROR ... violates check constraint "tracking_event_type_check"
-- rollback;
--
-- 4. Existing history is intact (same counts before and after):
-- select event_type, count(*) from public.document_tracking_events group by 1 order by 1;
--
-- 5. Entries saved while the constraint blocked them (the app kept them with
--    event_type NULL and the intended type in metadata):
-- select id, status, metadata->>'event_type_rejected' as intended_type, created_at
--   from public.document_tracking_events
--  where metadata ? 'event_type_rejected'
--  order by created_at desc;
--
-- ── Optional, after verifying: restore the type on those entries ─────────────
-- update public.document_tracking_events
--    set event_type = metadata->>'event_type_rejected',
--        metadata   = metadata - 'event_type_rejected'
--  where event_type is null and metadata ? 'event_type_rejected';
--
-- ── Rollback ────────────────────────────────────────────────────────────────
-- The NOTICE "Old definition: ..." printed above is the previous constraint.
-- To go back, drop the new one and re-add that exact definition:
-- alter table public.document_tracking_events drop constraint tracking_event_type_check;
-- alter table public.document_tracking_events add constraint tracking_event_type_check <old definition>;
