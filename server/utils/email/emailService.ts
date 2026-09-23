/**
 * server/utils/email/emailService.ts
 *
 * Low-level, provider-agnostic email sender. The rest of FlowVision never talks
 * to nodemailer (or any provider) directly — everything calls `sendDocumentEmail()`
 * from here. Swapping providers later means changing only this file.
 *
 * Hard requirements enforced here (do not weaken):
 *   - NEVER throws. A caller's tracking/pickup/dropoff action must always succeed
 *     even if email sending fails entirely (network down, bad credentials, etc.).
 *   - Idempotent: the same (document_id, event_type, recipient_email, dedupe_key)
 *     is only ever sent once, enforced by a DB unique constraint (not just an
 *     in-memory check), so this is safe even if the caller is itself retried.
 *   - Dev/console mode by default: real sending only happens when EMAIL_ENABLED=true
 *     AND SMTP credentials are present. Otherwise every call safely no-ops and logs
 *     non-sensitive metadata only.
 *   - Credentials (SMTP_PASSWORD etc.) are read from process.env server-side only —
 *     never placed in runtimeConfig.public, never returned to the browser.
 */

import { createClient } from '@supabase/supabase-js'
import { renderDocumentEmail } from './emailTemplates'
import type { EmailSendResult, SendDocumentEmailInput } from './emailTypes'

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey))
}

// ── Provider transport (nodemailer, lazily constructed — mirrors the lazy-client
// pattern already used by server/utils/groq.ts so a missing/invalid config never
// crashes the app at boot). ──────────────────────────────────────────────────
let transporter: import('nodemailer').Transporter | null = null

function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === 'true' && !!process.env.SMTP_HOST
}

async function getTransport() {
  if (transporter) return transporter
  const nodemailer = await import('nodemailer')
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  })
  return transporter
}

function fromAddress(): string {
  return process.env.SMTP_FROM || 'FlowVision <no-reply@flowvision.local>'
}

/**
 * Sends (or, in dev mode, logs) a single transactional document email.
 * Always resolves — never rejects — regardless of provider or DB failures.
 */
export async function sendDocumentEmail(input: SendDocumentEmailInput): Promise<EmailSendResult> {
  try {
    if (!input.recipientEmail || !input.recipientEmail.includes('@')) {
      return { sent: false, skippedReason: 'NO_RECIPIENT' }
    }

    const db = getServiceSupabase()
    const { subject, html, text } = renderDocumentEmail(input.eventType, input.document, input.trackingUrl)

    // ── Idempotency: reserve the row first. The UNIQUE constraint on
    // (document_id, event_type, recipient_email, dedupe_key) is the real guard —
    // this insert either succeeds (we own this send) or fails with 23505 (someone
    // already reserved/sent it), in which case we skip. Safe under concurrent retries.
    const { data: reserved, error: reserveErr } = await db
      .from('email_notifications')
      .insert({
        org_id: input.orgId,
        document_id: input.documentId,
        recipient_email: input.recipientEmail,
        recipient_type: input.recipientType,
        event_type: input.eventType,
        dedupe_key: input.dedupeKey,
        subject,
        status: 'PENDING',
      })
      .select('id')
      .single()

    if (reserveErr) {
      // 23505 = unique_violation → already sent (or in flight). Not an error, just a skip.
      if (reserveErr.code === '23505') {
        return { sent: false, skippedReason: 'ALREADY_SENT' }
      }
      console.error('[emailService] Failed to reserve email row (sending skipped, tracking unaffected):', reserveErr.message)
      return { sent: false, error: reserveErr.message }
    }

    const rowId = (reserved as { id: string }).id

    // ── Dev/console mode — never contacts a real provider, never logs secrets.
    if (!isEmailEnabled()) {
      console.log(
        '[EMAIL DEV MODE]\n' +
        `  event: ${input.eventType}\n` +
        `  recipient: ${input.recipientEmail} (${input.recipientType})\n` +
        `  document: ${input.document.trackingCode ?? input.documentId}\n` +
        `  status: ${input.document.status}\n` +
        `  subject: ${subject}`,
      )
      await db.from('email_notifications').update({ status: 'DEV_MODE_SKIPPED' }).eq('id', rowId)
      return { sent: false, skippedReason: 'DEV_MODE' }
    }

    // ── Real send.
    try {
      const transport = await getTransport()
      const info = await transport.sendMail({
        from: fromAddress(),
        to: input.recipientEmail,
        subject,
        html,
        text,
      })

      await db.from('email_notifications').update({
        status: 'SENT',
        provider_message_id: info.messageId ?? null,
        sent_at: new Date().toISOString(),
      }).eq('id', rowId)

      return { sent: true, providerMessageId: info.messageId ?? null }
    } catch (sendErr: any) {
      const message = sendErr?.message || 'Unknown email provider error'
      console.error('[emailService] Send failed (tracking action is unaffected):', message)
      await db.from('email_notifications').update({
        status: 'FAILED',
        error_message: String(message).slice(0, 500),
      }).eq('id', rowId)
      return { sent: false, error: message }
    }
  } catch (err: any) {
    // Absolute last resort — this function must never throw into a caller's
    // tracking/pickup/dropoff/assignment flow.
    console.error('[emailService] Unexpected error (tracking action is unaffected):', err?.message || err)
    return { sent: false, error: err?.message || 'Unexpected email service error' }
  }
}
