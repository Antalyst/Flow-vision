-- 05_email_notifications_migration.sql
-- Transactional email outbox/idempotency ledger for the ASN + creator lifecycle emails.
--
-- No existing table can safely serve this purpose: public.notifications (the in-app
-- notification feed) has no recipient_email/provider_message_id/dedupe fields, and
-- repurposing it would risk the existing notification UI queries. This table is
-- write-once-per-event and only ever read by the email service itself.

CREATE TABLE IF NOT EXISTS public.email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    document_id UUID,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(30) NOT NULL,     -- 'creator' | 'destination_office' | 'liaison'
    event_type VARCHAR(50) NOT NULL,         -- 'DOCUMENT_REGISTERED' | 'LIAISON_ASSIGNED' | 'DOCUMENT_IN_TRANSIT' | 'ASN' | 'DOCUMENT_ARRIVED' | 'DOCUMENT_VERIFIED' | 'DOCUMENT_COMPLETED' | 'DISCREPANCY_REPORTED'
    dedupe_key VARCHAR(255) NOT NULL,        -- caller-computed: stable across retries of the SAME logical transition, distinct across genuinely new ones (e.g. current_step, liaison_user_id)
    subject TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING | SENT | FAILED | DEV_MODE_SKIPPED
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT fk_email_notifications_org
      FOREIGN KEY (org_id) REFERENCES public.org(org_id) ON DELETE CASCADE,
    CONSTRAINT fk_email_notifications_document
      FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,

    -- Idempotency: the same logical transition, for the same recipient, is never sent twice.
    CONSTRAINT uq_email_notifications_idempotency
      UNIQUE (document_id, event_type, recipient_email, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_document ON public.email_notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_org ON public.email_notifications(org_id);

-- Service-role only table (same access pattern as public.notifications) — no anon/public
-- policies are defined, so RLS blocks anon/publishable-key access by default once enabled.
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
