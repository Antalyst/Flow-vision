-- Scope employee inbound alerts to a destination mini-office branch
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.offices(id);

CREATE INDEX IF NOT EXISTS idx_notifications_office_inbound
  ON public.notifications(org_id, target_role, office_id, is_read, created_at DESC)
  WHERE target_role = 'employee';
