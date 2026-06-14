import { randomUUID } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { analyzeDocumentBuffer } from '~~/server/utils/aiAnalyzer'

const ALLOWED_ROLES = ['client', 'employee']

export default defineEventHandler(async (event) => {
  const db = event.context.db
  const client = await serverSupabaseClient(event)

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'MySQL storage connector is not available on the request context.',
    })
  }

  // --- Step 1: RBAC guard -------------------------------------------------
  // Auth is cookie-based: login sets `user_session` (user_id) and `user_role`.
  const userId = getCookie(event, 'user_session')
  const userRole = getCookie(event, 'user_role')

  if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may upload documents.',
    })
  }

  // --- Read multipart form data ------------------------------------------
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No multi-part form data received.' })
  }

  const fileItem = formData.find((item) => item.name === 'file')
  const officeId = formData.find((item) => item.name === 'office_id')?.data.toString() || null
  const orgId = formData.find((item) => item.name === 'org_id')?.data.toString() || null
  const stageId = formData.find((item) => item.name === 'stage_id')?.data.toString() || null
  const clientQrCode = formData.find((item) => item.name === 'qr_code_data')?.data.toString() || null

  if (!fileItem || !fileItem.data) {
    throw createError({ statusCode: 400, message: 'Missing document file payload.' })
  }

  if (!orgId) {
    throw createError({ statusCode: 400, message: 'Missing org_id for document scope.' })
  }

  const fileName = fileItem.filename || 'unnamed'
  const mimeType = fileItem.type || 'application/octet-stream'

  let supabaseDocId: string | null = null

  try {
    // --- Step 2: AI hydration --------------------------------------------
    const aiAnalysis = await analyzeDocumentBuffer(fileItem.data, mimeType)

    // --- Step 3: Supabase metadata write ---------------------------------
    const documentId = randomUUID()
    // Prefer the tracking code the client already printed; fall back to a server-generated one.
    const qrCode = clientQrCode || `QR-${Math.random().toString(36).substring(2, 11).toUpperCase()}`

    const { data: supabaseDoc, error: supabaseError } = await client
      .from('documents')
      .insert({
        id: documentId,
        org_id: orgId,
        office_id: officeId,
        stage_id: stageId,
        user_id: userId,
        title: aiAnalysis.title,
        description: aiAnalysis.description,
        qr_code_data: qrCode,
        status: 'Pending',
      })
      .select()
      .single()

    if (supabaseError) throw supabaseError
    supabaseDocId = supabaseDoc.id

    // --- Step 4: Hostinger MySQL blob link -------------------------------
    const [mysqlResult] = await db.execute(
      'INSERT INTO document_storage (document_uuid, file_blob, file_name, mime_type) VALUES (?, ?, ?, ?)',
      [supabaseDoc.id, fileItem.data, fileName, mimeType]
    )
    const mysqlInsertedId = (mysqlResult as any).insertId

    // Back-link the blob row so RAG hydration can resolve it by mysql_storage_id.
    const { error: linkError } = await client
      .from('documents')
      .update({ mysql_storage_id: mysqlInsertedId })
      .eq('id', supabaseDoc.id)

    if (linkError) throw linkError

    return {
      success: true,
      message: 'Document parsed, analyzed, and split-stored successfully.',
      metadata: { ...supabaseDoc, mysql_storage_id: mysqlInsertedId },
      storage: {
        engine: 'Hostinger_MySQL_Blob',
        targetId: mysqlInsertedId,
      },
    }
  } catch (error: any) {
    // Rollback the Supabase metadata row if the blob link failed mid-flight.
    if (supabaseDocId) {
      await client.from('documents').delete().eq('id', supabaseDocId)
    }

    console.error('[Document Upload] Hybrid storage failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Document upload failed: ${error.message || 'Internal Server Error'}`,
    })
  }
})
