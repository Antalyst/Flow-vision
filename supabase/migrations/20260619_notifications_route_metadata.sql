-- Messenger pickup notifications: route context for pickup source + next destination

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_metadata
  ON public.notifications USING gin (metadata);
