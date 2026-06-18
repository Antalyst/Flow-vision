-- Client dispatch station — one permanent checkpoint office per organisation.
ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS is_client_station BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.offices.is_client_station IS
  'True for the org-wide client dispatch desk checkpoint used for messenger origin pickup scans.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_offices_one_client_station_per_org
  ON public.offices(org_id)
  WHERE is_client_station = true;