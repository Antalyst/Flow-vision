-- ============================================================================
-- FlowVision — Mini-Office Architecture (CORRECTED)
-- Migration: 20260615_mini_office_architecture.sql
-- Run ORDER: after 20260615_add_office_code.sql AND 20260615_tracking_engine.sql
--
-- Correction from first attempt:
--   offices.id is UUID (not INTEGER).  All FK columns that reference offices(id)
--   must therefore be UUID.  The previous INTEGER declaration caused:
--     ERROR 42804: foreign key constraint cannot be implemented —
--     incompatible types: integer and uuid.
--
--   Additionally every Number(office_id) cast in the application layer has been
--   removed; UUIDs are passed as raw strings through the Supabase JS client.
-- ============================================================================

-- ── Safe teardown of any partially-applied columns from the failed attempt ──
-- These DROP IF EXISTS are idempotent; they no-op if the column was never
-- created (because the constraint error aborted the transaction).

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS origin_office_id,
  DROP COLUMN IF EXISTS current_office_id,
  DROP COLUMN IF EXISTS creator_role;

ALTER TABLE public.stages
  DROP COLUMN IF EXISTS office_id;

-- Drop trigger + functions that may have been created before the type mismatch
DROP TRIGGER  IF EXISTS trg_document_office_org_guard ON public.documents;
DROP TRIGGER  IF EXISTS trg_stage_office_org_guard    ON public.stages;
DROP TRIGGER  IF EXISTS trg_offices_org_immutable      ON public.offices;
DROP FUNCTION IF EXISTS public.fn_document_office_org_guard();
DROP FUNCTION IF EXISTS public.fn_stage_office_org_guard();
DROP FUNCTION IF EXISTS public.fn_offices_org_immutable();
DROP VIEW     IF EXISTS public.v_stages_visible;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. OFFICES — add created_by
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS created_by TEXT;

COMMENT ON COLUMN public.offices.created_by IS
  'user_id of the employee or admin who provisioned this office branch';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENTS — origin_office_id, current_office_id, creator_role
--    FK type is now correctly UUID (matching offices.id)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS origin_office_id UUID
    REFERENCES public.offices(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS current_office_id UUID
    REFERENCES public.offices(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS creator_role TEXT
    CHECK (creator_role IS NULL
           OR creator_role IN ('client','employee','messenger','system'));

COMMENT ON COLUMN public.documents.origin_office_id IS
  'UUID of the office where this hard-copy was physically submitted. '
  'NULL for client-admin uploads; mandatory for employee uploads (DB trigger enforced).';

COMMENT ON COLUMN public.documents.current_office_id IS
  'UUID of the office currently holding this document. '
  'Set on ARRIVED_AT_OFFICE; cleared to NULL while IN_TRANSIT.';

COMMENT ON COLUMN public.documents.creator_role IS
  'Denormalised role of the creating user (client | employee | messenger). '
  'Stored at insert time to power the employee-origin mandate trigger '
  'without requiring a cross-table join.';

-- Indexes for lookup patterns
CREATE INDEX IF NOT EXISTS idx_documents_origin_office
  ON public.documents(origin_office_id)
  WHERE origin_office_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_current_office
  ON public.documents(current_office_id)
  WHERE current_office_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. STAGES — office_id discriminator (Global vs Local route template)
--    FK type is UUID (matching offices.id)
-- ────────────────────────────────────────────────────────────────────────────
--
--   NULL     = Global route template — created by a client admin, visible to
--              every member of the organisation.
--   non-NULL = Local route template  — scoped to a specific sub-office branch,
--              visible only to employees of that office.

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS office_id UUID
    REFERENCES public.offices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.stages.office_id IS
  'NULL = global (org-wide, admin-created). '
  'UUID = local mini-office route (scoped to this branch).';

-- Composite index for the two primary read patterns:
--   a) global routes only:        WHERE org_id = ? AND office_id IS NULL
--   b) global + my-office routes: WHERE org_id = ? AND (office_id IS NULL OR office_id = ?)
CREATE INDEX IF NOT EXISTS idx_stages_scope
  ON public.stages(org_id, office_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. INTEGRITY TRIGGER — documents: cross-org guard + employee mandate
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_document_office_org_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Guard A: origin_office_id must belong to the same org as the document
  IF NEW.origin_office_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.offices
      WHERE  id        = NEW.origin_office_id
        AND  org_id::TEXT = NEW.org_id::TEXT
    ) THEN
      RAISE EXCEPTION
        'CROSS_ORG_VIOLATION: origin_office_id (%) does not belong to org_id (%)',
        NEW.origin_office_id, NEW.org_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Guard B: current_office_id must belong to the same org
  IF NEW.current_office_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.offices
      WHERE  id        = NEW.current_office_id
        AND  org_id::TEXT = NEW.org_id::TEXT
    ) THEN
      RAISE EXCEPTION
        'CROSS_ORG_VIOLATION: current_office_id (%) does not belong to org_id (%)',
        NEW.current_office_id, NEW.org_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Guard C: Employee mandate — origin_office_id is NOT optional for employees
  IF NEW.creator_role = 'employee' AND NEW.origin_office_id IS NULL THEN
    RAISE EXCEPTION
      'EMPLOYEE_ORIGIN_REQUIRED: Employees must supply origin_office_id '
      'when registering a hard-copy document.'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_office_org_guard
  BEFORE INSERT OR UPDATE OF origin_office_id, current_office_id, org_id, creator_role
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_document_office_org_guard();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. INTEGRITY TRIGGER — stages: cross-org guard on local route office_id
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_stage_office_org_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.office_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.offices
      WHERE  id        = NEW.office_id
        AND  org_id::TEXT = NEW.org_id::TEXT
    ) THEN
      RAISE EXCEPTION
        'CROSS_ORG_VIOLATION: stages.office_id (%) does not belong to org_id (%)',
        NEW.office_id, NEW.org_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stage_office_org_guard
  BEFORE INSERT OR UPDATE OF office_id, org_id
  ON public.stages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_stage_office_org_guard();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. INTEGRITY TRIGGER — offices: org_id is immutable after creation
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_offices_org_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.org_id <> OLD.org_id THEN
    RAISE EXCEPTION
      'ORG_IMMUTABLE: offices.org_id cannot be changed after creation.'
      USING ERRCODE = 'P0003';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offices_org_immutable
  BEFORE UPDATE OF org_id ON public.offices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_offices_org_immutable();

-- ────────────────────────────────────────────────────────────────────────────
-- 7. ROW-LEVEL SECURITY (defense-in-depth)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stages' AND policyname = 'org_members_read_stages'
  ) THEN
    CREATE POLICY org_members_read_stages ON public.stages
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'offices' AND policyname = 'org_members_read_offices'
  ) THEN
    CREATE POLICY org_members_read_offices ON public.offices
      FOR SELECT USING (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. HELPER VIEW — v_stages_visible
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_stages_visible AS
SELECT
  s.stage_id,
  s.name,
  s.org_id,
  s.step_number,
  s.office_id,
  s.created_at,
  CASE WHEN s.office_id IS NULL THEN 'global' ELSE 'local' END AS scope,
  o.name AS office_name,
  o.code AS office_code
FROM  public.stages  s
LEFT JOIN public.offices o ON o.id = s.office_id;

COMMENT ON VIEW public.v_stages_visible IS
  'Global (office_id IS NULL) + local (office_id IS NOT NULL) route templates. '
  'Employees query: WHERE org_id = :org AND (office_id IS NULL OR office_id = :mine)';

-- ────────────────────────────────────────────────────────────────────────────
-- 9. BACK-FILL
-- ────────────────────────────────────────────────────────────────────────────

-- 9a. creator_role — read from users table (safe: user_id → TEXT join)
--     No-op when tables are empty; safe to run on fresh data too.
UPDATE public.documents d
SET    creator_role = u.role
FROM   public.users u
WHERE  u.user_id::TEXT = d.user_id::TEXT
  AND  d.creator_role  IS NULL;

-- 9b. origin_office_id for existing employee-uploaded documents.
--     office_id on documents is already UUID — no ::UUID cast needed.
--     Cast to TEXT for the regex guard so the ~ operator resolves correctly.
UPDATE public.documents d
SET    origin_office_id  = d.office_id,
       current_office_id = d.office_id
FROM   public.users   u,
       public.offices  o
WHERE  u.user_id::TEXT    = d.user_id::TEXT
  AND  u.role             = 'employee'
  AND  o.id               = d.office_id
  AND  o.org_id::TEXT     = d.org_id::TEXT
  AND  d.office_id        IS NOT NULL
  AND  d.origin_office_id IS NULL;

-- 9c. current_office_id for ARRIVED / COMPLETED documents (any role)
UPDATE public.documents d
SET    current_office_id = d.office_id
FROM   public.offices o
WHERE  o.id              = d.office_id
  AND  o.org_id::TEXT    = d.org_id::TEXT
  AND  d.office_id       IS NOT NULL
  AND  d.current_office_id IS NULL
  AND  d.tracking_status IN ('ARRIVED_AT_OFFICE','COMPLETED');

-- ────────────────────────────────────────────────────────────────────────────
-- Summary of net schema changes after this migration
-- ────────────────────────────────────────────────────────────────────────────
--
-- offices
--   + created_by          TEXT (nullable)
--   + trigger trg_offices_org_immutable
--   + RLS enabled
--
-- documents
--   + origin_office_id    UUID  FK → offices(id)  (nullable; mandatory for employees)
--   + current_office_id   UUID  FK → offices(id)  (nullable; live position tracker)
--   + creator_role        TEXT  CHECK IN (client|employee|messenger|system)
--   + trigger trg_document_office_org_guard
--
-- stages
--   + office_id           UUID  FK → offices(id)  (nullable; NULL=global, UUID=local)
--   + index idx_stages_scope (org_id, office_id)
--   + trigger trg_stage_office_org_guard
--   + RLS enabled
--
-- new view: v_stages_visible
-- ============================================================================
