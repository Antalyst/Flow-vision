-- ============================================================================
-- FlowVision — Document Issue Tracking & Office Chat
-- Migration: 20260615_document_issues_chat.sql
-- Run ORDER: after 20260615_mini_office_architecture.sql
--
-- Purpose:
--   Allow receiving offices to report incomplete / problematic hard copies
--   (missing pages, skipped signatures, etc.) and converse with the
--   originating office via a threaded message log tied to each issue.
--
-- Tables:
--   document_issues   — one row per reported discrepancy on a document
--   document_messages — threaded chat messages within an issue
--
-- Tracking state:
--   Adds DISCREPANCY_REPORTED to the document tracking status machine so
--   ops dashboards can surface documents with open quality issues.
--
-- Tenant isolation:
--   • org_id denormalized on document_issues (indexed)
--   • Integrity triggers enforce org consistency across documents, offices,
--     issues, and messages before any row is committed
--   • ON DELETE CASCADE from documents → issues → messages
-- ============================================================================

-- ── 0. Safe teardown (idempotent re-run) ────────────────────────────────────
-- NOTE: DROP TRIGGER … ON table requires the table to exist in PostgreSQL.
-- Drop tables first (CASCADE removes triggers); then drop standalone functions.

DROP TABLE IF EXISTS public.document_messages CASCADE;
DROP TABLE IF EXISTS public.document_issues   CASCADE;

DROP FUNCTION IF EXISTS public.fn_document_issue_org_guard();
DROP FUNCTION IF EXISTS public.fn_document_message_org_guard();

DO $$ BEGIN
  DROP TYPE IF EXISTS public.document_issue_status;
EXCEPTION
  WHEN dependent_objects_still_exist THEN NULL;
END $$;

-- ── 1. Issue status enum ────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'document_issue_status'
  ) THEN
    CREATE TYPE public.document_issue_status AS ENUM ('OPEN', 'RESOLVED');
  END IF;
END $$;

-- ── 2. Extend tracking status machine ───────────────────────────────────────
-- documents.tracking_status and document_tracking_events.status both use TEXT
-- CHECK constraints (see 20260615_tracking_engine.sql).  We also extend the
-- standalone doc_tracking_status enum for forward compatibility.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_tracking_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_enum e
      JOIN   pg_type t ON t.oid = e.enumtypid
      WHERE  t.typname = 'doc_tracking_status'
        AND  e.enumlabel = 'DISCREPANCY_REPORTED'
    ) THEN
      ALTER TYPE public.doc_tracking_status
        ADD VALUE 'DISCREPANCY_REPORTED' BEFORE 'COMPLETED';
    END IF;
  END IF;
END $$;

-- Drop and recreate CHECK constraints to include the new state.
-- Guard each ALTER so this migration can run even if tracking_engine
-- was not applied yet (column/table may not exist on a fresh project).

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'documents'
      AND  column_name  = 'tracking_status'
  ) THEN
    ALTER TABLE public.documents
      DROP CONSTRAINT IF EXISTS documents_tracking_status_check;

    ALTER TABLE public.documents
      ADD CONSTRAINT documents_tracking_status_check
      CHECK (tracking_status IN (
        'CREATED',
        'PICKED_UP',
        'IN_TRANSIT',
        'ARRIVED_AT_OFFICE',
        'DISCREPANCY_REPORTED',
        'COMPLETED'
      ));

    EXECUTE $cmt$
      COMMENT ON COLUMN public.documents.tracking_status IS
        'Physical document pipeline state. DISCREPANCY_REPORTED indicates an open '
        'quality issue (missing pages, skipped signatures, etc.) logged by a '
        'receiving office via document_issues.'
    $cmt$;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public'
      AND  table_name   = 'document_tracking_events'
  ) THEN
    ALTER TABLE public.document_tracking_events
      DROP CONSTRAINT IF EXISTS document_tracking_events_status_check;

    ALTER TABLE public.document_tracking_events
      ADD CONSTRAINT document_tracking_events_status_check
      CHECK (status IN (
        'CREATED',
        'PICKED_UP',
        'IN_TRANSIT',
        'ARRIVED_AT_OFFICE',
        'DISCREPANCY_REPORTED',
        'COMPLETED'
      ));
  END IF;
END $$;

-- ── 3. document_issues ────────────────────────────────────────────────────────
--
-- org_id is TEXT to match documents.org_id / org.org_id (multi-tenant key).
-- reported_by_office_id is UUID to match offices.id.

CREATE TABLE public.document_issues (
  id                      UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id             UUID                     NOT NULL
                            REFERENCES public.documents(id) ON DELETE CASCADE,
  org_id                  TEXT                     NOT NULL,
  reported_by_office_id   UUID                     NOT NULL
                            REFERENCES public.offices(id) ON DELETE RESTRICT,
  title                   VARCHAR(255)             NOT NULL,
  status                  public.document_issue_status NOT NULL DEFAULT 'OPEN',
  created_at              TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

  CONSTRAINT document_issues_title_not_blank
    CHECK (length(trim(title)) > 0)
);

COMMENT ON TABLE public.document_issues IS
  'Quality / completeness issues reported against a specific physical document. '
  'Receiving offices open an issue; originating offices resolve it via chat.';

COMMENT ON COLUMN public.document_issues.org_id IS
  'Denormalized tenant key — must always match documents.org_id for the parent row. '
  'Indexed for org-scoped queries and cross-tenant leakage prevention.';

COMMENT ON COLUMN public.document_issues.reported_by_office_id IS
  'The sub-office branch that detected the problem (e.g. missing signature page).';

-- Org-scoped indexes (primary read paths)
CREATE INDEX idx_document_issues_org
  ON public.document_issues(org_id, created_at DESC);

CREATE INDEX idx_document_issues_org_status
  ON public.document_issues(org_id, status, created_at DESC);

CREATE INDEX idx_document_issues_document
  ON public.document_issues(document_id, created_at DESC);

CREATE INDEX idx_document_issues_reporting_office
  ON public.document_issues(reported_by_office_id, created_at DESC);

-- ── 4. document_messages ────────────────────────────────────────────────────
--
-- sender_id is TEXT to match users.user_id (session identity key used app-wide).

CREATE TABLE public.document_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      UUID        NOT NULL
                  REFERENCES public.document_issues(id) ON DELETE CASCADE,
  sender_id     TEXT        NOT NULL,
  message_text  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT document_messages_text_not_blank
    CHECK (length(trim(message_text)) > 0)
);

COMMENT ON TABLE public.document_messages IS
  'Threaded chat messages within a document issue. '
  'Cascade-deleted when the parent issue or document is removed.';

COMMENT ON COLUMN public.document_messages.sender_id IS
  'user_id of the message author (matches users.user_id / session cookie).';

-- Message thread read path: chronological within an issue
CREATE INDEX idx_document_messages_issue
  ON public.document_messages(issue_id, created_at ASC);

CREATE INDEX idx_document_messages_sender
  ON public.document_messages(sender_id, created_at DESC)
  WHERE sender_id IS NOT NULL;

-- ── 5. Integrity triggers — anti-leakage structural checks ──────────────────

-- Guard A: issue.org_id must match parent document.org_id
-- Guard B: reported_by_office_id must belong to the same org as the issue
CREATE OR REPLACE FUNCTION public.fn_document_issue_org_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_doc_org_id    TEXT;
  v_office_org_id TEXT;
BEGIN
  -- Resolve the document's org_id (authoritative tenant key)
  SELECT org_id::TEXT INTO v_doc_org_id
  FROM   public.documents
  WHERE  id = NEW.document_id;

  IF v_doc_org_id IS NULL THEN
    RAISE EXCEPTION
      'DOCUMENT_NOT_FOUND: Cannot create issue — document % does not exist.',
      NEW.document_id;
  END IF;

  -- Force org_id to match the document (ignore client-supplied org_id tampering)
  NEW.org_id := v_doc_org_id;

  -- Verify reporting office belongs to the same org
  SELECT org_id::TEXT INTO v_office_org_id
  FROM   public.offices
  WHERE  id = NEW.reported_by_office_id;

  IF v_office_org_id IS NULL THEN
    RAISE EXCEPTION
      'OFFICE_NOT_FOUND: reporting office % does not exist.',
      NEW.reported_by_office_id;
  END IF;

  IF v_office_org_id <> NEW.org_id THEN
    RAISE EXCEPTION
      'CROSS_ORG_VIOLATION: reporting office % belongs to org % but document belongs to org %.',
      NEW.reported_by_office_id, v_office_org_id, NEW.org_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_issue_org_guard
  BEFORE INSERT OR UPDATE OF document_id, org_id, reported_by_office_id
  ON public.document_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_document_issue_org_guard();

-- Guard C: message sender must belong to the same org as the parent issue
CREATE OR REPLACE FUNCTION public.fn_document_message_org_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_issue_org_id  TEXT;
  v_sender_org_id TEXT;
BEGIN
  SELECT org_id::TEXT INTO v_issue_org_id
  FROM   public.document_issues
  WHERE  id = NEW.issue_id;

  IF v_issue_org_id IS NULL THEN
    RAISE EXCEPTION
      'ISSUE_NOT_FOUND: Cannot post message — issue % does not exist.',
      NEW.issue_id;
  END IF;

  SELECT org_id::TEXT INTO v_sender_org_id
  FROM   public.users
  WHERE  user_id::TEXT = NEW.sender_id;

  IF v_sender_org_id IS NULL THEN
    RAISE EXCEPTION
      'SENDER_NOT_FOUND: user % does not exist.',
      NEW.sender_id;
  END IF;

  IF v_sender_org_id <> v_issue_org_id THEN
    RAISE EXCEPTION
      'CROSS_ORG_VIOLATION: sender % (org %) cannot post to issue in org %.',
      NEW.sender_id, v_sender_org_id, v_issue_org_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_message_org_guard
  BEFORE INSERT OR UPDATE OF issue_id, sender_id
  ON public.document_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_document_message_org_guard();

-- ── 6. Row-Level Security ────────────────────────────────────────────────────
-- Enabled for defense-in-depth.  The app uses a service-role key server-side
-- (which bypasses RLS).  Uncomment policies if these tables are exposed via
-- the PostgREST Data API to authenticated clients.

ALTER TABLE public.document_issues   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_messages ENABLE ROW LEVEL SECURITY;

-- Example org-scoped read policy (uncomment when needed):
-- CREATE POLICY "org members read own document issues"
--   ON public.document_issues
--   FOR SELECT
--   USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id'));
--
-- CREATE POLICY "org members read own issue messages"
--   ON public.document_messages
--   FOR SELECT
--   USING (
--     issue_id IN (
--       SELECT id FROM public.document_issues
--       WHERE org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')
--     )
--   );

-- ── Summary ─────────────────────────────────────────────────────────────────
-- New enum:  document_issue_status  ('OPEN' | 'RESOLVED')
-- New state: DISCREPANCY_REPORTED   added to tracking status machine
--
-- New table: document_issues
--   id, document_id, org_id, reported_by_office_id, title, status, created_at
--   FK: document_id → documents(id) ON DELETE CASCADE
--   FK: reported_by_office_id → offices(id) ON DELETE RESTRICT
--
-- New table: document_messages
--   id, issue_id, sender_id, message_text, created_at
--   FK: issue_id → document_issues(id) ON DELETE CASCADE
--
-- Cascade chain: documents → document_issues → document_messages
-- Org indexes:   document_issues(org_id, …), document_issues(org_id, status, …)
-- ============================================================================
