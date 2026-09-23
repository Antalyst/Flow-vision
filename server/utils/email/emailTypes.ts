/**
 * server/utils/email/emailTypes.ts
 *
 * Shared types for the transactional email system. This is a notification
 * CHANNEL on top of the existing tracking/notification architecture — it does
 * not introduce a second tracking state machine or a second notification system.
 */

export type EmailEventType =
  | 'DOCUMENT_REGISTERED'
  | 'LIAISON_ASSIGNED'
  | 'DOCUMENT_IN_TRANSIT'   // creator-facing status email
  | 'ASN'                   // destination-office Advance Shipping Notice (also fired on the IN_TRANSIT transition)
  | 'DOCUMENT_ARRIVED'
  | 'DOCUMENT_VERIFIED'     // intermediate-stop desk clearance (not the final leg)
  | 'DOCUMENT_COMPLETED'
  | 'DISCREPANCY_REPORTED'

export type EmailRecipientType = 'creator' | 'destination_office' | 'liaison'

export interface EmailDocumentContext {
  id: string
  title: string
  trackingCode: string | null
  documentType?: string | null
  originOfficeName?: string | null
  currentOfficeName?: string | null
  destinationOfficeName?: string | null
  liaisonName?: string | null
  status: string
  timestamp: string // ISO
}

export interface SendDocumentEmailInput {
  orgId: string
  documentId: string
  eventType: EmailEventType
  recipientType: EmailRecipientType
  recipientEmail: string
  /**
   * Caller-computed, stable across retries of the SAME logical transition
   * (e.g. `current_step`, or a liaison's user_id for LIAISON_ASSIGNED),
   * distinct for a genuinely new transition. See emailService.ts's idempotency check.
   */
  dedupeKey: string
  document: EmailDocumentContext
  trackingUrl: string
}

export interface EmailSendResult {
  sent: boolean
  skippedReason?: 'ALREADY_SENT' | 'DEV_MODE' | 'NO_RECIPIENT'
  error?: string
  providerMessageId?: string | null
}
