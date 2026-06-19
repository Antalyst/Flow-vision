-- Operational reports submitted by employees/messengers/clients

CREATE TABLE IF NOT EXISTS public.operational_reports (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES public.org(org_id),
  submitted_by      UUID        NOT NULL REFERENCES public.users(user_id),
  submitter_role    VARCHAR     NOT NULL,
  report_type       VARCHAR     NOT NULL,
  title             VARCHAR     NOT NULL,
  body              TEXT        NOT NULL,
  scope             VARCHAR     DEFAULT 'GLOBAL',
  metadata          JSONB       DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_reports_org
  ON public.operational_reports(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_reports_submitter
  ON public.operational_reports(submitted_by, created_at DESC);
