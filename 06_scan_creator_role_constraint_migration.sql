-- 06_scan_creator_role_constraint_migration.sql
--
-- Fixes a pre-existing gap in documents_creator_role_check: the constraint
-- only allowed ('client', 'employee', 'messenger'), so ANY document insert
-- with creator_role = 'employee_sub_user' was rejected at the database level
-- — for both the physical-scan pipeline (scan/register.post.ts) and the
-- existing digital-upload pipeline (upload.post.ts), which both already set
-- creator_role from the authenticated actor's role.
--
-- employee_sub_user has been a valid, authenticated role throughout the
-- codebase (RBAC guards, actorContext.ts, assign-liaison eligibility, etc.)
-- — this migration only brings the CHECK constraint in line with the roles
-- the application has always allowed to register documents.
--
-- Run manually in the Supabase SQL editor (this project's existing
-- migration convention — Claude cannot execute DDL directly).

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_creator_role_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_creator_role_check
  CHECK (creator_role IS NULL OR creator_role IN ('client', 'employee', 'employee_sub_user', 'messenger'));
