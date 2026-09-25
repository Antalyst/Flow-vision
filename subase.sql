-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.account_types (
  acctype_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  created_at date DEFAULT CURRENT_DATE,
  CONSTRAINT account_types_pkey PRIMARY KEY (acctype_id)
);
CREATE TABLE public.users (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role character varying DEFAULT NULL::character varying,
  full_name character varying DEFAULT NULL::character varying,
  birth_year integer,
  age integer,
  email character varying NOT NULL UNIQUE,
  verified integer,
  password character varying NOT NULL,
  acctype_id uuid,
  org_id uuid,
  created_at date DEFAULT CURRENT_DATE,
  status integer,
  birth_date date,
  office_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_acctype_id_fkey FOREIGN KEY (acctype_id) REFERENCES public.account_types(acctype_id),
  CONSTRAINT fk_user_org FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT users_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id)
);
CREATE TABLE public.org (
  org_id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying DEFAULT NULL::character varying,
  name character varying DEFAULT NULL::character varying,
  user_id uuid,
  created_at character varying DEFAULT NULL::character varying,
  enable_employee_validation boolean DEFAULT false,
  CONSTRAINT org_pkey PRIMARY KEY (org_id),
  CONSTRAINT org_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.offices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  assigned_user uuid,
  org_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  stage_id uuid,
  code text UNIQUE,
  created_by text,
  parent_office_id uuid,
  is_client_station boolean DEFAULT false,
  CONSTRAINT offices_pkey PRIMARY KEY (id),
  CONSTRAINT offices_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT offices_assigned_user_fkey FOREIGN KEY (assigned_user) REFERENCES public.users(user_id),
  CONSTRAINT offices_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(stage_id),
  CONSTRAINT offices_parent_office_id_fkey FOREIGN KEY (parent_office_id) REFERENCES public.offices(id)
);
CREATE TABLE public.stages (
  stage_id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  name character varying NOT NULL,
  step_number integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  office_id uuid,
  CONSTRAINT stages_pkey PRIMARY KEY (stage_id),
  CONSTRAINT stages_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT stages_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid,
  office_id uuid,
  user_id uuid,
  title text,
  description text,
  qr_code_data text UNIQUE,
  status character varying DEFAULT 'Pending'::character varying,
  mysql_storage_id integer,
  created_at timestamp with time zone DEFAULT now(),
  stage_id uuid,
  tracking_status text NOT NULL DEFAULT 'CREATED'::text CHECK (tracking_status = ANY (ARRAY['CREATED'::text, 'PICKED_UP'::text, 'IN_TRANSIT'::text, 'ARRIVED_AT_OFFICE'::text, 'DISCREPANCY_REPORTED'::text, 'COMPLETED'::text])),
  current_step integer NOT NULL DEFAULT 0,
  assigned_messenger_id text,
  origin_office_id uuid,
  current_office_id uuid,
  creator_role text CHECK (creator_role IS NULL OR (creator_role = ANY (ARRAY['client'::text, 'employee'::text, 'employee_sub_user'::text, 'messenger'::text]))),
  checkpoint_cleared_step integer,
  category_id uuid,
  target_completion_date timestamp with time zone,
  version integer DEFAULT 1,
  priority character varying DEFAULT 'NORMAL'::character varying,
  target_date timestamp with time zone,
  carrier_id uuid,
  source_type character varying DEFAULT 'UPLOAD'::character varying,
  scan_status character varying DEFAULT 'NOT_SCANNED'::character varying,
  ai_analysis_status character varying DEFAULT 'NOT_ANALYZED'::character varying,
  page_count integer DEFAULT 1,
  scan_session_id uuid,
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT documents_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT documents_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(stage_id),
  CONSTRAINT documents_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.users(user_id),
  CONSTRAINT documents_origin_office_id_fkey FOREIGN KEY (origin_office_id) REFERENCES public.offices(id),
  CONSTRAINT documents_current_office_id_fkey FOREIGN KEY (current_office_id) REFERENCES public.offices(id),
  CONSTRAINT fk_documents_scan_session FOREIGN KEY (scan_session_id) REFERENCES public.document_scan_sessions(id),
  CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.document_categories(id)
);
CREATE TABLE public.stage_steps (
  stage_step_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  stage_id uuid NOT NULL,
  office_id uuid NOT NULL,
  step_number integer NOT NULL,
  org_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stage_steps_pkey PRIMARY KEY (stage_step_id),
  CONSTRAINT stage_steps_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(stage_id),
  CONSTRAINT stage_steps_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id),
  CONSTRAINT stage_steps_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id)
);
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL DEFAULT 'New Chat'::character varying,
  user_id character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  org_id uuid NOT NULL,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying]::text[])),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_chat_session FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.document_tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  org_id text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['CREATED'::text, 'PICKED_UP'::text, 'IN_TRANSIT'::text, 'ARRIVED_AT_OFFICE'::text, 'DISCREPANCY_REPORTED'::text, 'COMPLETED'::text])),
  step_index integer,
  office_id integer,
  actor_id text,
  actor_role text,
  actor_name text,
  office_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_tracking_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.document_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  org_id text NOT NULL,
  reported_by_office_id uuid NOT NULL,
  title character varying NOT NULL CHECK (length(TRIM(BOTH FROM title)) > 0),
  status USER-DEFINED NOT NULL DEFAULT 'OPEN'::document_issue_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  issue_type character varying,
  target_office_id uuid,
  details text,
  CONSTRAINT document_issues_pkey PRIMARY KEY (id),
  CONSTRAINT document_issues_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id),
  CONSTRAINT document_issues_reported_by_office_id_fkey FOREIGN KEY (reported_by_office_id) REFERENCES public.offices(id),
  CONSTRAINT document_issues_target_office_id_fkey FOREIGN KEY (target_office_id) REFERENCES public.offices(id)
);
CREATE TABLE public.document_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL,
  sender_id text NOT NULL,
  message_text text NOT NULL CHECK (length(TRIM(BOTH FROM message_text)) > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_messages_pkey PRIMARY KEY (id),
  CONSTRAINT document_messages_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.document_issues(id)
);
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  office_id uuid,
  user_id uuid NOT NULL,
  action_type character varying NOT NULL,
  document_id uuid,
  details text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  actor_name character varying,
  user_name character varying,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT activity_logs_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT activity_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid,
  target_role character varying,
  document_id uuid,
  title character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  is_claimed boolean DEFAULT false,
  claimed_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  office_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT notifications_claimed_by_fkey FOREIGN KEY (claimed_by_user_id) REFERENCES public.users(user_id),
  CONSTRAINT notifications_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id),
  CONSTRAINT notifications_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id)
);
CREATE TABLE public.operational_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  submitted_by uuid NOT NULL,
  submitter_role character varying NOT NULL,
  report_type character varying NOT NULL,
  title character varying NOT NULL,
  body text NOT NULL,
  scope character varying DEFAULT 'GLOBAL'::character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT operational_reports_pkey PRIMARY KEY (id),
  CONSTRAINT operational_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT operational_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_group boolean DEFAULT false,
  group_name character varying,
  group_avatar_url text,
  title character varying,
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  participant_type character varying NOT NULL,
  user_id uuid,
  office_id uuid,
  joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  role character varying DEFAULT 'member'::character varying,
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_user_id uuid,
  sender_office_id uuid,
  message_text text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  read_by jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT direct_messages_pkey PRIMARY KEY (id),
  CONSTRAINT direct_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.document_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  sla_days integer,
  CONSTRAINT document_categories_pkey PRIMARY KEY (id),
  CONSTRAINT document_categories_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.org(org_id)
);
CREATE TABLE public.org_employee_whitelists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  employee_id_number character varying NOT NULL,
  full_name character varying,
  email character varying,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT org_employee_whitelists_pkey PRIMARY KEY (id),
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES public.org(org_id)
);
CREATE TABLE public.document_scan_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  scan_mode character varying NOT NULL DEFAULT 'FIRST_PAGE'::character varying,
  status character varying NOT NULL DEFAULT 'CREATED'::character varying,
  page_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT document_scan_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.document_ai_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  scan_session_id uuid,
  model character varying NOT NULL,
  document_type character varying,
  title text,
  sender text,
  recipient text,
  subject text,
  document_date date,
  summary text,
  priority character varying,
  contains_signature boolean DEFAULT false,
  contains_letterhead boolean DEFAULT false,
  contains_stamp boolean DEFAULT false,
  contains_seal boolean DEFAULT false,
  confidence numeric,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_ai_analysis_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ai_analysis_document FOREIGN KEY (document_id) REFERENCES public.documents(id)
);
CREATE TABLE public.email_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  document_id uuid,
  recipient_email character varying NOT NULL,
  recipient_type character varying NOT NULL,
  event_type character varying NOT NULL,
  dedupe_key character varying NOT NULL,
  subject text,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying,
  provider_message_id text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk_email_notifications_org FOREIGN KEY (org_id) REFERENCES public.org(org_id),
  CONSTRAINT fk_email_notifications_document FOREIGN KEY (document_id) REFERENCES public.documents(id)
);