-- ============================================================================
-- Enable Supabase Realtime for document issue chat tables
-- Migration: 20260615_document_issues_realtime.sql
-- Run after: 20260615_document_issues_chat.sql
-- ============================================================================

-- Add tables to the Realtime publication (idempotent).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE  pubname = 'supabase_realtime'
        AND  schemaname = 'public'
        AND  tablename = 'document_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.document_messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE  pubname = 'supabase_realtime'
        AND  schemaname = 'public'
        AND  tablename = 'document_issues'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.document_issues;
    END IF;
  END IF;
END $$;

-- Replica identity FULL ensures Realtime postgres_changes includes all columns
ALTER TABLE public.document_messages REPLICA IDENTITY FULL;
ALTER TABLE public.document_issues   REPLICA IDENTITY FULL;
