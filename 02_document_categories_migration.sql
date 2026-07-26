-- Migration: Document Categorization
-- Create document_categories table
CREATE TABLE IF NOT EXISTS public.document_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.org(org_id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for multi-tenant isolation
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their org"
  ON public.document_categories
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM public.users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert categories in their org"
  ON public.document_categories
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT org_id FROM public.users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update categories in their org"
  ON public.document_categories
  FOR UPDATE
  USING (
    org_id = (SELECT org_id FROM public.users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete categories in their org"
  ON public.document_categories
  FOR DELETE
  USING (
    org_id = (SELECT org_id FROM public.users WHERE user_id = auth.uid())
  );

-- Add category_id to public.documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.document_categories(id) ON DELETE SET NULL;
