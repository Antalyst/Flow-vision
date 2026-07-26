-- Private Messenger Migration Script
-- Run this in your Supabase SQL Editor

-- 1. Create conversations table
CREATE TABLE public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conversations_pkey PRIMARY KEY (id)
);

-- 2. Create conversation participants table
CREATE TABLE public.conversation_participants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    participant_type character varying NOT NULL, -- 'user' or 'office'
    user_id uuid, -- Populated if participant_type is 'user'
    office_id uuid, -- Populated if participant_type is 'office'
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conversation_participants_pkey PRIMARY KEY (id)
);

-- 3. Create direct messages table
CREATE TABLE public.direct_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_user_id uuid,
    sender_office_id uuid,
    message_text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_by jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT direct_messages_pkey PRIMARY KEY (id)
);

-- Optional: Create RLS policies if you use them, but typically your API uses service_role
