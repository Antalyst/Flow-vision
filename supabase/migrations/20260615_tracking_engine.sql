-- =============================================================================
-- FlowVision Document Tracking Engine Migration
-- Implements a sequential, multi-stage routing tracker for physical documents.
-- Run this once in your Supabase SQL editor (or via `supabase db push`).
-- =============================================================================

-- ── 1. Status enum type ──────────────────────────────────────────────────────
-- Defines the pipeline lifecycle as a PostgreSQL CHECK constraint so the DB
-- itself enforces valid transitions (defense in depth alongside app logic).

DO $$ BEGIN
  -- Idempotent: only create if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'doc_tracking_status'
  ) THEN
    CREATE TYPE doc_tracking_status AS ENUM (
      'CREATED',            -- Document registered; awaiting messenger pickup
      'PICKED_UP',          -- Messenger has physically acquired the hard copy
      'IN_TRANSIT',         -- Messenger is traveling to next sequential checkpoint
      'ARRIVED_AT_OFFICE',  -- Checked in at a specific target office checkpoint
      'COMPLETED'           -- Document has passed through all required stages
    );
  END IF;
END $$;

-- ── 2. Extend the documents table ────────────────────────────────────────────
-- tracking_status  → explicit pipeline state (new enum)
-- current_step     → which index in stage_steps the document is currently at
--                    (0 = awaiting first pickup, 1 = at step 1, etc.)
-- assigned_messenger_id → the user_id of the messenger holding the document

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tracking_status  TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (tracking_status IN ('CREATED','PICKED_UP','IN_TRANSIT','ARRIVED_AT_OFFICE','COMPLETED')),
  ADD COLUMN IF NOT EXISTS current_step     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_messenger_id TEXT;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_tracking_status
  ON public.documents(org_id, tracking_status);

CREATE INDEX IF NOT EXISTS idx_documents_messenger
  ON public.documents(assigned_messenger_id)
  WHERE assigned_messenger_id IS NOT NULL;

-- ── 3. document_tracking_events table ────────────────────────────────────────
-- Immutable append-only audit ledger. Every status transition writes one row.
-- This is the source of truth for the fulfillment timeline view.

CREATE TABLE IF NOT EXISTS public.document_tracking_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL,  -- FK resolved at app layer for flexibility
  org_id          TEXT        NOT NULL,  -- strict tenant isolation column
  status          TEXT        NOT NULL
    CHECK (status IN ('CREATED','PICKED_UP','IN_TRANSIT','ARRIVED_AT_OFFICE','COMPLETED')),
  step_index      INTEGER,               -- which route step this event occurred at
  office_id       INTEGER,               -- target office for this event (if applicable)
  actor_id        TEXT,                  -- user_id of who triggered the event
  actor_role      TEXT,                  -- 'client' | 'employee' | 'messenger'
  actor_name      TEXT,                  -- denormalized display name (avoids joins on read)
  office_name     TEXT,                  -- denormalized office name
  notes           TEXT,                  -- optional free-text note from actor
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the two primary read paths:
--   1. Full timeline for a single document (document detail view)
--   2. Ops queue scoped to an org (current-working dashboard)

CREATE INDEX IF NOT EXISTS idx_tracking_events_document
  ON public.document_tracking_events(document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_events_org
  ON public.document_tracking_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_events_actor
  ON public.document_tracking_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- ── 4. RLS policies ───────────────────────────────────────────────────────────
-- Enable Row-Level Security. Actual SELECT/INSERT policies are intentionally
-- left as placeholders because this app uses a service-role key server-side
-- (which bypasses RLS). Add policies here if you expose these tables directly
-- to the anon/authenticated PostgREST data API.

ALTER TABLE public.document_tracking_events ENABLE ROW LEVEL SECURITY;

-- Example policy (uncomment if needed):
-- CREATE POLICY "org members can read own tracking events"
--   ON public.document_tracking_events
--   FOR SELECT USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id'));

-- ── 5. Back-fill existing documents ──────────────────────────────────────────
-- Insert a synthetic CREATED event for every document that doesn't have one yet.
-- This keeps the timeline consistent for pre-migration records.

INSERT INTO public.document_tracking_events
  (document_id, org_id, status, step_index, actor_role, actor_name, notes)
SELECT
  id,
  org_id::TEXT,
  'CREATED',
  0,
  'system',
  'System (migration back-fill)',
  'Tracking event created by schema migration 20260615_tracking_engine'
FROM public.documents
WHERE id NOT IN (
  SELECT DISTINCT document_id
  FROM public.document_tracking_events
  WHERE status = 'CREATED'
)
ON CONFLICT DO NOTHING;

-- ── Summary ──────────────────────────────────────────────────────────────────
-- New columns on documents:
--   tracking_status      TEXT  DEFAULT 'CREATED'
--   current_step         INT   DEFAULT 0
--   assigned_messenger_id TEXT
--
-- New table: document_tracking_events
--   id, document_id, org_id, status, step_index,
--   office_id, actor_id, actor_role, actor_name, office_name, notes, created_at
-- =============================================================================
