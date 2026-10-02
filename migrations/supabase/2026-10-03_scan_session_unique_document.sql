-- ============================================================================
-- FlowVision — One document per physical-scan session (OPTIONAL, recommended)
-- Run manually in the Supabase SQL editor. Additive only; safe to re-run.
--
-- /api/documents/scan/register already returns the existing document when the
-- same scan session is registered again (retry, lost response, double click).
-- This index closes the remaining gap — two requests arriving at the same
-- instant — at the database level; the endpoint treats the resulting
-- unique-violation (23505) as "already registered" and returns that document.
--
-- Rows are not changed. Documents without a scan session (normal uploads) are
-- not affected: the index only covers rows where scan_session_id is set.
-- ============================================================================

-- 1. Check first (read-only): any existing duplicates? Expect 0 rows.
--    If rows are returned, do NOT create the index until they are reviewed.
-- select scan_session_id, count(*), array_agg(id order by created_at) as document_ids
--   from public.documents
--  where scan_session_id is not null
--  group by scan_session_id
-- having count(*) > 1;

-- 2. The index.
create unique index if not exists documents_scan_session_id_unique
  on public.documents (scan_session_id)
  where scan_session_id is not null;

-- 3. Verify:
-- select indexdef from pg_indexes where indexname = 'documents_scan_session_id_unique';

-- Rollback:
-- drop index if exists public.documents_scan_session_id_unique;
