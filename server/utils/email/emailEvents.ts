/**
 * server/utils/email/emailEvents.ts
 *
 * One function per document lifecycle event. Existing tracking/assignment
 * endpoints call these (one line each) instead of touching the email service
 * directly. Each function:
 *   1. Resolves recipients server-side (creator via documents.user_id +
 *      creator_role; office recipients via offices.assigned_user and
 *      users.office_id — no new email column needed anywhere).
 *   2. Builds a role-appropriate authenticated deep link (the public /tracking
 *      page is still a mock/demo — confirmed by reading it — so it is
 *      deliberately NOT used here).
 *   3. Calls sendDocumentEmail() once per recipient. Every call is wrapped so a
 *      failure here can never bubble into the caller's tracking action.
 *
 * Nothing in this file writes to documents/tracking_events/notifications — the
 * existing tracking state machine and in-app notification system are untouched.
 */

import { createClient } from '@supabase/supabase-js'
import { sendDocumentEmail } from './emailService'
import type { EmailDocumentContext, EmailRecipientType } from './emailTypes'

function getServiceSupabase() {
  const config = useRuntimeConfig()
  return createClient(String(config.public.supabaseUrl), String(config.supabaseServiceKey))
}

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/** Role-appropriate authenticated deep link — never the public mock /tracking page. */
function buildTrackingUrl(role: string | null | undefined, documentId: string): string {
  const base = appBaseUrl()
  if (role === 'employee' || role === 'employee_sub_user') {
    return `${base}/employee/documents?document=${documentId}`
  }
  // client, or unknown — client's document drawer is the safest default (org-wide view)
  return `${base}/client/documents?id=${documentId}`
}

async function resolveCreatorEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const db = getServiceSupabase()
  const { data } = await db.from('users').select('email').eq('user_id', userId).maybeSingle()
  return data?.email || null
}

/**
 * Every distinct email address for a given office: whoever it's `assigned_user`
 * is, plus everyone whose `users.office_id` points at it (the same relationship
 * the Liaison-assignment work already reuses) — no new office email column.
 */
async function resolveOfficeRecipientEmails(officeId: string | null | undefined): Promise<string[]> {
  if (!officeId) return []
  const db = getServiceSupabase()

  const [{ data: office }, { data: staff }] = await Promise.all([
    db.from('offices').select('assigned_user').eq('id', officeId).maybeSingle(),
    db.from('users').select('email').eq('office_id', officeId),
  ])

  const emails = new Set<string>()
  for (const row of staff ?? []) {
    if (row?.email) emails.add(row.email)
  }
  if (office?.assigned_user) {
    const { data: assignedUser } = await db.from('users').select('email').eq('user_id', office.assigned_user).maybeSingle()
    if (assignedUser?.email) emails.add(assignedUser.email)
  }
  return Array.from(emails)
}

interface BaseEventInput {
  orgId: string
  documentId: string
  title: string
  trackingCode: string | null
  creatorUserId: string | null | undefined
  creatorRole: string | null | undefined
  status: string
  currentStep: number
}

export async function emitDocumentRegisteredEmail(input: BaseEventInput & { originOfficeName?: string | null }) {
  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (!creatorEmail) return

  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    originOfficeName: input.originOfficeName ?? null,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  await sendDocumentEmail({
    orgId: input.orgId,
    documentId: input.documentId,
    eventType: 'DOCUMENT_REGISTERED',
    recipientType: 'creator',
    recipientEmail: creatorEmail,
    dedupeKey: 'registered', // one-time event per document
    document: doc,
    trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
  })
}

export async function emitLiaisonAssignedEmail(input: BaseEventInput & {
  liaisonUserId: string
  liaisonName: string | null
  currentOfficeName?: string | null
  destinationOfficeName?: string | null
}) {
  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (!creatorEmail) return

  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    currentOfficeName: input.currentOfficeName ?? null,
    destinationOfficeName: input.destinationOfficeName ?? null,
    liaisonName: input.liaisonName,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  await sendDocumentEmail({
    orgId: input.orgId,
    documentId: input.documentId,
    eventType: 'LIAISON_ASSIGNED',
    recipientType: 'creator',
    recipientEmail: creatorEmail,
    // Keyed by which liaison was assigned for which step, so a REassignment
    // (different liaison, same step) still sends a fresh email.
    dedupeKey: `${input.currentStep}:${input.liaisonUserId}`,
    document: doc,
    trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
  })
}

/**
 * The actual dispatch point — fired when the document truly enters IN_TRANSIT
 * (a physical QR pickup scan), NOT merely when a Liaison is selected. Sends the
 * creator a status email AND the destination office its Advance Shipping Notice.
 */
export async function emitInTransitEmails(input: BaseEventInput & {
  originOfficeName?: string | null
  destinationOfficeId: string | null
  destinationOfficeName?: string | null
  liaisonName?: string | null
}) {
  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    originOfficeName: input.originOfficeName ?? null,
    destinationOfficeName: input.destinationOfficeName ?? null,
    liaisonName: input.liaisonName ?? null,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  const tasks: Promise<unknown>[] = []

  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (creatorEmail) {
    tasks.push(sendDocumentEmail({
      orgId: input.orgId,
      documentId: input.documentId,
      eventType: 'DOCUMENT_IN_TRANSIT',
      recipientType: 'creator',
      recipientEmail: creatorEmail,
      dedupeKey: String(input.currentStep),
      document: doc,
      trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
    }))
  }

  // ASN → the CURRENT leg's destination office only (never a later leg — the
  // caller always passes the immediate next-step office, resolved fresh per call).
  if (input.destinationOfficeId) {
    const officeEmails = await resolveOfficeRecipientEmails(input.destinationOfficeId)
    for (const email of officeEmails) {
      tasks.push(sendDocumentEmail({
        orgId: input.orgId,
        documentId: input.documentId,
        eventType: 'ASN',
        recipientType: 'destination_office' as EmailRecipientType,
        recipientEmail: email,
        dedupeKey: `${input.currentStep}:${input.destinationOfficeId}`,
        document: doc,
        trackingUrl: buildTrackingUrl('employee', input.documentId),
      }))
    }
  }

  await Promise.allSettled(tasks)
}

export async function emitArrivedEmail(input: BaseEventInput & { currentOfficeName?: string | null }) {
  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (!creatorEmail) return

  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    currentOfficeName: input.currentOfficeName ?? null,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  await sendDocumentEmail({
    orgId: input.orgId,
    documentId: input.documentId,
    eventType: 'DOCUMENT_ARRIVED',
    recipientType: 'creator',
    recipientEmail: creatorEmail,
    dedupeKey: String(input.currentStep),
    document: doc,
    trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
  })
}

export async function emitVerifiedEmail(input: BaseEventInput & { currentOfficeName?: string | null }) {
  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (!creatorEmail) return

  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    currentOfficeName: input.currentOfficeName ?? null,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  await sendDocumentEmail({
    orgId: input.orgId,
    documentId: input.documentId,
    eventType: 'DOCUMENT_VERIFIED',
    recipientType: 'creator',
    recipientEmail: creatorEmail,
    dedupeKey: String(input.currentStep),
    document: doc,
    trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
  })
}

export async function emitCompletedEmail(input: BaseEventInput & { currentOfficeName?: string | null }) {
  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (!creatorEmail) return

  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    currentOfficeName: input.currentOfficeName ?? null,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  await sendDocumentEmail({
    orgId: input.orgId,
    documentId: input.documentId,
    eventType: 'DOCUMENT_COMPLETED',
    recipientType: 'creator',
    recipientEmail: creatorEmail,
    dedupeKey: 'completed', // one-time event per document
    document: doc,
    trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
  })
}

export async function emitDiscrepancyEmail(input: BaseEventInput & { currentOfficeName?: string | null }) {
  const creatorEmail = await resolveCreatorEmail(input.creatorUserId)
  if (!creatorEmail) return

  const doc: EmailDocumentContext = {
    id: input.documentId,
    title: input.title,
    trackingCode: input.trackingCode,
    currentOfficeName: input.currentOfficeName ?? null,
    status: input.status,
    timestamp: new Date().toISOString(),
  }

  await sendDocumentEmail({
    orgId: input.orgId,
    documentId: input.documentId,
    eventType: 'DISCREPANCY_REPORTED',
    recipientType: 'creator',
    recipientEmail: creatorEmail,
    // A document could theoretically be flagged more than once across its life —
    // key by step so each occurrence at a new leg still notifies.
    dedupeKey: String(input.currentStep),
    document: doc,
    trackingUrl: buildTrackingUrl(input.creatorRole, input.documentId),
  })
}
