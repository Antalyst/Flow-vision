-- ============================================================================
-- FlowVision — Compliance issue targeting & categorization
-- Adds issue_type, target_office_id, and details to document_issues.
-- ============================================================================

ALTER TABLE public.document_issues
  ADD COLUMN IF NOT EXISTS issue_type      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS target_office_id UUID REFERENCES public.offices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS details         TEXT;

COMMENT ON COLUMN public.document_issues.issue_type IS
  'Category of discrepancy (e.g. Missing Signatures, Incomplete Forms).';

COMMENT ON COLUMN public.document_issues.target_office_id IS
  'Office desk selected for compliance chat — origin or previous hand-off checkpoint.';

COMMENT ON COLUMN public.document_issues.details IS
  'Free-text problem description supplied when the issue was flagged.';

CREATE INDEX IF NOT EXISTS idx_document_issues_target_office
  ON public.document_issues(target_office_id, status, created_at DESC);

-- Extend org guard to validate target_office_id when present.
CREATE OR REPLACE FUNCTION public.fn_document_issue_org_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_doc_org_id         TEXT;
  v_office_org_id      TEXT;
  v_target_office_org  TEXT;
BEGIN
  SELECT org_id::TEXT INTO v_doc_org_id
  FROM   public.documents
  WHERE  id = NEW.document_id;

  IF v_doc_org_id IS NULL THEN
    RAISE EXCEPTION
      'DOCUMENT_NOT_FOUND: Cannot create issue — document % does not exist.',
      NEW.document_id;
  END IF;

  NEW.org_id := v_doc_org_id;

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

  IF NEW.target_office_id IS NOT NULL THEN
    SELECT org_id::TEXT INTO v_target_office_org
    FROM   public.offices
    WHERE  id = NEW.target_office_id;

    IF v_target_office_org IS NULL THEN
      RAISE EXCEPTION
        'OFFICE_NOT_FOUND: target office % does not exist.',
        NEW.target_office_id;
    END IF;

    IF v_target_office_org <> NEW.org_id THEN
      RAISE EXCEPTION
        'CROSS_ORG_VIOLATION: target office % belongs to org % but document belongs to org %.',
        NEW.target_office_id, v_target_office_org, NEW.org_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
