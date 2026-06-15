import { serverSupabaseClient } from '#supabase/server'

/**
 * GET /api/employee/ledger
 * Returns a personal document audit trail for the authenticated employee.
 * Scope rules (OR logic, both anchored to org_id for cross-tenant isolation):
 *   1. Documents directly uploaded by this employee (user_id = userId)
 *   2. Documents routed to any office this employee is assigned to
 *
 * Query params:
 *   orgId   – employee's org_id
 *   userId  – employee's user_id
 *   limit   – max rows (default 50)
 */
export default defineEventHandler(async (event) => {
  const query  = getQuery(event)
  const orgId  = query.orgId  as string | undefined
  const userId = query.userId as string | undefined
  const limit  = Math.min(Number(query.limit ?? 50), 200)

  if (!orgId || !userId) {
    throw createError({
      statusCode: 400,
      message: 'orgId and userId query parameters are required',
    })
  }

  const client = await serverSupabaseClient(event)

  // Step 1: resolve which office IDs are assigned to this employee in this org
  const { data: assignedOffices, error: officeError } = await client
    .from('offices')
    .select('id')
    .eq('org_id', orgId)
    .eq('assigned_user', userId)

  if (officeError) {
    throw createError({ statusCode: 500, message: officeError.message })
  }

  const officeIds = (assignedOffices ?? []).map((o: any) => o.id)

  // Step 2: fetch documents scoped to this org that belong to the employee
  // either by direct upload OR by office assignment
  let docQuery = client
    .from('documents')
    .select('id, title, description, status, qr_code_data, office_id, stage_id, created_at, user_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (officeIds.length > 0) {
    // Rows where user uploaded OR office belongs to employee
    docQuery = docQuery.or(`user_id.eq.${userId},office_id.in.(${officeIds.join(',')})`)
  } else {
    // No assigned offices — only show own uploads
    docQuery = docQuery.eq('user_id', userId)
  }

  const { data: documents, error: docError } = await docQuery

  if (docError) {
    throw createError({ statusCode: 500, message: docError.message })
  }

  // Step 3: resolve office names in a single follow-up query
  const uniqueOfficeIds = Array.from(
    new Set((documents ?? []).map((d: any) => d.office_id).filter(Boolean))
  )

  let officeNameById: Record<string, string> = {}
  if (uniqueOfficeIds.length > 0) {
    const { data: officeRows } = await client
      .from('offices')
      .select('id, name, code')
      .in('id', uniqueOfficeIds)

    officeNameById = (officeRows ?? []).reduce((acc: Record<string, string>, o: any) => {
      acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name
      return acc
    }, {})
  }

  const enriched = (documents ?? []).map((doc: any) => ({
    ...doc,
    office_label: doc.office_id ? (officeNameById[String(doc.office_id)] ?? `Office #${doc.office_id}`) : null,
    is_own_upload: String(doc.user_id) === String(userId),
  }))

  return { success: true, data: enriched }
})
