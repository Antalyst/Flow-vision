-- Migration Script: Add 'title' column to conversations table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS title character varying(255);
