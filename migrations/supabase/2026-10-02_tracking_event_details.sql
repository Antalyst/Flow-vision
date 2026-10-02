-- ============================================================================
-- NOTE (2026-10-03): local testing showed the live table ALREADY had
-- event_type, guarded by a CHECK constraint (tracking_event_type_check) that
-- rejects the workflow's event types — so the inserts were failing on that
-- constraint, not on a missing column. Running this file is harmless (every
-- statement is "if not exists"); the actual fix is
-- 2026-10-03_tracking_event_type_check.sql.
-- ============================================================================
-- FlowVision — Tracking event details (OPTIONAL, recommended)
-- Run manually in the Supabase SQL editor. Additive only; safe to re-run.
--
-- Why: the custody / release workflow records each history entry with an
-- event_type (e.g. RECEIVED_BY_OFFICE, RELEASE_APPROVED, CYCLE_STARTED) and a
-- small metadata object (office ids, cycle number, liaison id). The schema
-- dump has neither column on document_tracking_events, so those inserts were
-- rejected and the receipt never reached the history — the roadmap kept
-- showing "On the Way" for documents that had been received.
--
-- The application now saves the entry WITHOUT these two columns when they are
-- missing, so nothing is lost either way. Adding them keeps the event type
-- and details (used to tell receipts from drop-offs and to repair recurring
-- cycle records from the exact return receipt).
--
-- Existing rows: both columns stay NULL. No data is changed or deleted.
-- ============================================================================

alter table public.document_tracking_events
  add column if not exists event_type text;

alter table public.document_tracking_events
  add column if not exists metadata jsonb;

-- Lookups by document + event type (recurring cycle repair, history filters).
create index if not exists idx_tracking_events_document_event_type
  on public.document_tracking_events (document_id, event_type);

-- PostgREST caches the schema; make the new columns visible immediately.
notify pgrst, 'reload schema';

-- ── Verification (read-only) ────────────────────────────────────────────────
-- Expect two rows: event_type | text, metadata | jsonb
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name = 'document_tracking_events'
--    and column_name in ('event_type', 'metadata');
--
-- After receiving a document, its newest event should carry the type:
-- select status, event_type, metadata, created_at
--   from public.document_tracking_events
--  where document_id = '<document id>'
--  order by created_at desc
--  limit 5;

-- ── Rollback (only if needed; the app keeps working without the columns) ────
-- drop index if exists public.idx_tracking_events_document_event_type;
-- alter table public.document_tracking_events drop column if exists metadata;
-- alter table public.document_tracking_events drop column if exists event_type;
