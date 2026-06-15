-- Migration: add `code` column to offices table
-- Run this once against your Supabase project.
--
-- The column stores a human-readable short identifier (e.g. OFF-3F9A2C).
-- It is UNIQUE to prevent duplicate codes but NULLABLE so existing rows
-- (created before this migration) are not broken.
--
-- After running this migration the POST /api/office endpoint will
-- auto-generate a code for every new office created.

ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Back-fill existing offices with a generated code
UPDATE public.offices
SET code = 'OFF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))
WHERE code IS NULL;

-- Optional: enable RLS if not already (recommended for Supabase)
-- ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
