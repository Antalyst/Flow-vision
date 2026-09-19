/**
 * POST /api/documents/scan/analyze
 *
 * Runs Groq Vision analysis over the captured page photo(s) for an existing
 * document_scan_sessions row and returns the structured, editable result.
 *
 * IMPORTANT: document_ai_analysis.document_id is NOT NULL in the schema, and no
 * `documents` row exists yet at this point in the flow (registration happens
 * later, after the user reviews/edits the AI output). So this endpoint does NOT
 * write to document_ai_analysis — it only returns the analysis for the review
 * screen. The reviewed result is persisted by /api/documents/scan/register once
 * a document_id exists.
 *
 * This endpoint IS safely re-callable — it's what powers "Retry AI Analysis"
 * after a failure. The captured images live in the browser (not server-side,
 * since document_pages was intentionally not created) and are re-sent on retry.
 */

import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { analyzeScannedDocument, type ScanMode } from '~~/server/utils/documentScanAi'

const ALLOWED_ROLES = ['client', 'employee', 'employee_sub_user']
const MAX_IMAGE_BYTES = 12 * 1024 * 1024 // 12MB per page photo
const MAX_PAGES = 20

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (!ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client, employee, or sub-user accounts may scan documents.',
    })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No multipart form data received.' })
  }

  const get = (name: string) => formData.find((f) => f.name === name)?.data.toString().trim() || null
  const sessionId = get('session_id')
  const scanMode = (get('scan_mode') as ScanMode) || 'FIRST_PAGE'

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'session_id is required.' })
  }

  const { data: session, error: sessionErr } = await client
    .from('document_scan_sessions')
    .select('id, user_id, organization_id, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionErr) {
    throw createError({ statusCode: 500, message: `Scan session lookup failed: ${sessionErr.message}` })
  }
  if (!session) {
    throw createError({ statusCode: 404, message: 'Scan session not found.' })
  }
  if (String(session.user_id) !== String(actor.userId) || String(session.organization_id) !== String(actor.orgId)) {
    throw createError({ statusCode: 403, message: 'This scan session does not belong to you.' })
  }

  // FIRST_PAGE is a one-page contract end-to-end — cap here so page_count and the
  // AI call downstream never disagree with what the UI claims was scanned.
  let imageItems = formData.filter((f) => f.name === 'pages')
  if (scanMode === 'FIRST_PAGE' && imageItems.length > 1) {
    imageItems = imageItems.slice(0, 1)
  }
  if (!imageItems.length) {
    throw createError({ statusCode: 400, message: 'At least one captured page image is required.' })
  }
  if (imageItems.length > MAX_PAGES) {
    throw createError({ statusCode: 413, message: `Too many pages — maximum ${MAX_PAGES} per scan.` })
  }
  for (const item of imageItems) {
    if (!item.type?.startsWith('image/')) {
      throw createError({ statusCode: 415, message: `Unsupported file type for a scanned page: ${item.type}` })
    }
    if (item.data.length > MAX_IMAGE_BYTES) {
      throw createError({ statusCode: 413, message: 'One of the captured pages exceeds the 12MB size limit.' })
    }
  }

  await client
    .from('document_scan_sessions')
    .update({ status: 'AI_ANALYZING', page_count: imageItems.length })
    .eq('id', sessionId)

  try {
    const images = imageItems.map((f) => ({ data: Buffer.from(f.data), mimeType: f.type || 'image/jpeg' }))
    const analysis = await analyzeScannedDocument(images, scanMode)

    await client
      .from('document_scan_sessions')
      .update({ status: 'REVIEW' })
      .eq('id', sessionId)

    return { success: true, session_id: sessionId, analysis }
  } catch (error: any) {
    await client
      .from('document_scan_sessions')
      .update({ status: 'FAILED' })
      .eq('id', sessionId)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'AI analysis failed. Your scan has been preserved — you can retry or continue manually.',
      data: { code: 'SCAN_AI_FAILED', session_id: sessionId },
    })
  }
})
