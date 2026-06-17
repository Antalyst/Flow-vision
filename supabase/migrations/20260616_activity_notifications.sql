-- Activity logs + messenger pickup notifications (aligned with live FlowVision schema)

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES public.org(org_id),
  office_id     UUID        REFERENCES public.offices(id),
  user_id       UUID        NOT NULL REFERENCES public.users(user_id),
  action_type   VARCHAR     NOT NULL,
  document_id   UUID        REFERENCES public.documents(id),
  details       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_name    VARCHAR,
  user_name     VARCHAR,
  message       TEXT,
  metadata      JSONB       DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_org
  ON public.activity_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_office
  ON public.activity_logs(org_id, office_id, created_at DESC)
  WHERE office_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user
  ON public.activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON public.activity_logs(org_id, action_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES public.org(org_id),
  user_id             UUID        REFERENCES public.users(user_id),
  target_role         VARCHAR,
  document_id         UUID        REFERENCES public.documents(id),
  title               VARCHAR     NOT NULL,
  message             TEXT        NOT NULL,
  is_read             BOOLEAN     DEFAULT false,
  is_claimed          BOOLEAN     DEFAULT false,
  claimed_by_user_id  UUID        REFERENCES public.users(user_id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_messenger_queue
  ON public.notifications(org_id, target_role, is_claimed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_document
  ON public.notifications(document_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
