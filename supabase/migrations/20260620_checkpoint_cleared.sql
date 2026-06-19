-- Office checkpoint clearance: employee must verify before next messenger pickup leg

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS checkpoint_cleared_step INTEGER;

COMMENT ON COLUMN public.documents.checkpoint_cleared_step IS
  'When set to documents.current_step, the desk at that route stop has reviewed and released the folder for the next messenger pickup.';
