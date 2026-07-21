import { serverSupabaseClient } from '#supabase/server'
import { ISSUE_ALLOWED_ROLES } from '~~/server/utils/documentIssues'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

/**
 * GET /api/documents/issues/flagged
 *
 * Lists documents with open compliance issues for the authenticated org.
 * Employees only see issues tied to their assigned offices.
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may view compliance logs.',
    })
  }

  const { data: issues, error } = await client
    .from('document_issues')
    .select(`
      id,
      document_id,
      org_id,
      reported_by_office_id,
      target_office_id,
      issue_type,
      title,
      details,
      status,
      created_at,
      documents (
        id,
        title,
        description,
        tracking_status,
        status,
        origin_office_id,
        current_office_id,
        office_id,
        stage_id,
        user_id,
        qr_code_data,
        created_at
      )
    `)
    .eq('org_id', actor.orgId)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const officeSet = new Set(actor.officeIds.map(String))

  const rows = (issues ?? []).filter((row) => {
    if (actor.userRole === 'client') return true

    const doc = (row as { documents?: Record<string, unknown> }).documents as {
      origin_office_id?: string | null
      current_office_id?: string | null
      office_id?: string | null
    } | null

    const relatedOffices = [
      row.reported_by_office_id,
      row.target_office_id,
      doc?.origin_office_id,
      doc?.current_office_id,
      doc?.office_id,
    ]
      .filter(Boolean)
      .map(String)

    return relatedOffices.some((id) => officeSet.has(id))
  })

  const officeIds = new Set<string>()
  for (const row of rows) {
    if (row.reported_by_office_id) officeIds.add(String(row.reported_by_office_id))
    if (row.target_office_id) officeIds.add(String(row.target_office_id))
    const doc = (row as { documents?: Record<string, unknown> }).documents
    if (doc?.origin_office_id) officeIds.add(String(doc.origin_office_id))
    if (doc?.current_office_id) officeIds.add(String(doc.current_office_id))
  }

  let officeMap: Record<string, { name: string; code?: string | null }> = {}
  if (officeIds.size > 0) {
    const { data: offices } = await client
      .from('offices')
      .select('id, name, code')
      .in('id', [...officeIds])

    officeMap = (offices ?? []).reduce(
      (acc, o) => {
        acc[String(o.id)] = { name: o.name, code: o.code ?? null }
        return acc
      },
      {} as Record<string, { name: string; code?: string | null }>,
    )
  }

  const data = rows.map((row) => {
    const doc = (row as { documents?: Record<string, unknown> }).documents ?? {}
    return {
      issue: {
        id: row.id,
        document_id: row.document_id,
        issue_type: row.issue_type,
        title: row.title,
        details: row.details,
        status: row.status,
        created_at: row.created_at,
        reported_by_office_id: row.reported_by_office_id,
        target_office_id: row.target_office_id,
        reported_by_office_name: officeMap[String(row.reported_by_office_id)]?.name ?? null,
        target_office_name: row.target_office_id
          ? officeMap[String(row.target_office_id)]?.name ?? null
          : null,
      },
      document: {
        ...doc,
        tracking_status: (doc as { tracking_status?: string }).tracking_status ?? 'DISCREPANCY_REPORTED',
      },
    }
  })

  return {
    success: true,
    count: data.length,
    data,
  }
})
