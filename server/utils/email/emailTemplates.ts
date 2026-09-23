/**
 * server/utils/email/emailTemplates.ts
 *
 * Inline-CSS, table-based HTML email templates (email-client-safe — no external
 * stylesheets, no flexbox/grid). One shared shell + per-event title/body copy.
 *
 * IMPORTANT: only metadata is included, never document contents/attachments —
 * per the security requirement not to expose confidential document data by email.
 */

import type { EmailDocumentContext, EmailEventType } from './emailTypes'

const BRAND_ORANGE = '#F97316'
const INK = '#18181B'
const MUTED = '#71717A'
const BORDER = '#E4E4E7'
const BG = '#F4F4F5'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case 'IN_TRANSIT': return BRAND_ORANGE
    case 'ARRIVED_AT_OFFICE': return '#0EA5E9'
    case 'COMPLETED': return '#10B981'
    case 'DISCREPANCY_REPORTED': return '#EF4444'
    default: return MUTED
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'CREATED': return 'Registered'
    case 'PICKED_UP': return 'Picked Up'
    case 'IN_TRANSIT': return 'In Transit'
    case 'ARRIVED_AT_OFFICE': return 'Arrived'
    case 'COMPLETED': return 'Completed'
    case 'DISCREPANCY_REPORTED': return 'Discrepancy Flagged'
    default: return status
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

interface EventCopy {
  eyebrow: string
  headline: string
  intro: string
}

function copyFor(eventType: EmailEventType, doc: EmailDocumentContext): EventCopy {
  switch (eventType) {
    case 'DOCUMENT_REGISTERED':
      return {
        eyebrow: 'Document Registered',
        headline: 'Your document has been registered',
        intro: `"${doc.title}" has been registered in FlowVision and is ready for the next step.`,
      }
    case 'LIAISON_ASSIGNED':
      return {
        eyebrow: 'Liaison Assigned',
        headline: 'A Liaison has been assigned to your document',
        intro: doc.liaisonName
          ? `${doc.liaisonName} has been assigned to carry "${doc.title}" for its next leg.`
          : `A Liaison has been assigned to carry "${doc.title}" for its next leg.`,
      }
    case 'DOCUMENT_IN_TRANSIT':
      return {
        eyebrow: 'Document Status Update',
        headline: 'Your document is now in transit',
        intro: `"${doc.title}" is currently in transit to your office.`,
      }
    case 'ASN':
      return {
        eyebrow: 'Advance Shipping Notice',
        headline: 'A document is on its way to your office',
        intro: 'The document is currently in transit to your office.',
      }
    case 'DOCUMENT_ARRIVED':
      return {
        eyebrow: 'Document Status Update',
        headline: 'Your document has arrived',
        intro: `"${doc.title}" has arrived at ${doc.currentOfficeName ?? 'the destination office'} and is awaiting desk review.`,
      }
    case 'DOCUMENT_VERIFIED':
      return {
        eyebrow: 'Document Status Update',
        headline: 'Your document was reviewed and cleared',
        intro: `"${doc.title}" was verified at ${doc.currentOfficeName ?? 'the current office'} and is ready for its next leg.`,
      }
    case 'DOCUMENT_COMPLETED':
      return {
        eyebrow: 'Document Completed',
        headline: 'Your document has completed its workflow',
        intro: `"${doc.title}" has been verified and completed at ${doc.currentOfficeName ?? 'its final destination'}.`,
      }
    case 'DISCREPANCY_REPORTED':
      return {
        eyebrow: 'Action Required',
        headline: 'A discrepancy was reported on your document',
        intro: `An issue was flagged on "${doc.title}" that needs your attention.`,
      }
  }
}

function infoRow(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:6px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:14px;font-weight:600;color:${INK};">${escapeHtml(value)}</td>
    </tr>`
}

export function renderDocumentEmail(eventType: EmailEventType, doc: EmailDocumentContext, trackingUrl: string): { subject: string; html: string; text: string } {
  const copy = copyFor(eventType, doc)
  const badgeColor = statusBadgeColor(doc.status)
  const label = statusLabel(doc.status)

  const rows = [
    infoRow('Document', doc.title),
    infoRow('Tracking Code', doc.trackingCode),
    infoRow('Document Type', doc.documentType ?? null),
    infoRow('From', doc.originOfficeName ?? doc.currentOfficeName ?? null),
    infoRow('To', doc.destinationOfficeName ?? null),
    infoRow('Liaison', doc.liaisonName ?? null),
    infoRow('Time', formatTimestamp(doc.timestamp)),
  ].filter(Boolean).join('')

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(copy.eyebrow)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background-color:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid ${BORDER};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:${INK};letter-spacing:-0.02em;">FlowVision</td>
                  <td align="right" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND_ORANGE};">${escapeHtml(copy.eyebrow)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 8px;font-size:20px;line-height:1.35;font-weight:800;color:${INK};">${escapeHtml(copy.headline)}</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED};">${escapeHtml(copy.intro)}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:${badgeColor}1A;color:${badgeColor};font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">
                    ${escapeHtml(label)}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                ${rows}
              </table>

              ${eventType === 'ASN' ? `<p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:${MUTED};">The document is currently in transit to your office. No estimated arrival time is available — you'll receive another notice when it's ready for desk review.</p>` : ''}

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background-color:${BRAND_ORANGE};">
                    <a href="${trackingUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      View Document
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background-color:${BG};border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:11px;line-height:1.6;color:${MUTED};">
                This is an automated notification from FlowVision. If you weren't expecting this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    'FLOWVISION',
    copy.eyebrow.toUpperCase(),
    '',
    copy.headline,
    copy.intro,
    '',
    `Document: ${doc.title}`,
    doc.trackingCode ? `Tracking Code: ${doc.trackingCode}` : '',
    doc.documentType ? `Document Type: ${doc.documentType}` : '',
    (doc.originOfficeName ?? doc.currentOfficeName) ? `From: ${doc.originOfficeName ?? doc.currentOfficeName}` : '',
    doc.destinationOfficeName ? `To: ${doc.destinationOfficeName}` : '',
    doc.liaisonName ? `Liaison: ${doc.liaisonName}` : '',
    `Status: ${label}`,
    `Time: ${formatTimestamp(doc.timestamp)}`,
    '',
    `View document: ${trackingUrl}`,
    '',
    'This is an automated notification from FlowVision.',
  ].filter(Boolean).join('\n')

  return { subject: `FlowVision — ${copy.headline}`, html, text }
}
