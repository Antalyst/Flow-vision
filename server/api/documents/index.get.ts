import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices, parseScope } from '~~/server/utils/actorContext'

/**
 * GET /api/documents
 *
 * Dual-perspective document listing with Big Picture / Small Picture toggle.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Role      │ scope=GLOBAL                │ scope=LOCAL                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ client    │ All org documents           │ (ignored — always GLOBAL)     │
 * │ employee  │ All org documents           │ Docs from employee's offices  │
 * │ messenger │ 401 — use tracking/queue    │ 401                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * LOCAL filter: documents where any of the following matches the employee's
 * assigned office UUIDs:
 *   • origin_office_id  — where the doc was physically registered
 *   • current_office_id — where the doc currently rests
 *   • office_id         — legacy office FK
 *
 * Security: org_id is ALWAYS resolved from the session via DB lookup.
 * The legacy `orgId` query param is accepted only as a fallback for clients
 * that have not yet been updated, and is validated against the session value.
 *
 * Query params:
 *   scope      'GLOBAL' | 'LOCAL'   default 'GLOBAL'
 *   limit       number               default 200, max 500
 */
export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query  = getQuery(event)

    const scope = parseScope(query.scope as string | undefined)
    const limit = Math.min(Number(query.limit ?? 200), 500)

    // ── Resolve actor from session (org_id is server-derived) ─────────────
    const actor = await resolveActorContextWithOffices(event, client)

    // Messengers use /api/tracking/queue
    if (actor.userRole === 'messenger') {
      throw createError({
        statusCode: 403,
        message: 'Messengers must use /api/tracking/queue for document access.',
      })
    }

    // ── Build base query ───────────────────────────────────────────────────
    let dbQuery = client
      .from('documents')
      .select('*')
      .eq('org_id', actor.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // ── Apply LOCAL scope filter for employees ─────────────────────────────
    //
    // LOCAL = only documents that originated from, or currently sit inside,
    // one of this employee's assigned sub-office branches.
    //
    // The OR covers three FK columns because different parts of the system
    // write to different fields:
    //   origin_office_id  → set at upload time for employee-created docs
    //   current_office_id → updated on every ARRIVED_AT_OFFICE event
    //   office_id         → legacy column; still present on older rows
    if (scope === 'LOCAL' && actor.userRole === 'employee') {
      if (actor.officeIds.length === 0) {
        // Employee has no assigned offices — return only their own uploads
        dbQuery = dbQuery.eq('user_id', actor.userId)
      } else {
        // Build OR predicate across all three office FK columns + own uploads
        const officeList = actor.officeIds.join(',')
        dbQuery = dbQuery.or(
          `user_id.eq.${actor.userId},` +
          `origin_office_id.in.(${officeList}),` +
          `current_office_id.in.(${officeList}),` +
          `office_id.in.(${officeList})`,
        )
      }
    }
    // GLOBAL (or client role): no additional filter — full org view

    const { data: documents, error } = await dbQuery

    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Error fetching documents' })
    }

    const rows = documents ?? []

    // ── Enrich: uploader display names ─────────────────────────────────────
    const uploaderIds = [...new Set(rows.map((d: any) => d.user_id).filter(Boolean))]
    let nameById: Record<string, string> = {}

    if (uploaderIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('user_id, full_name')
        .in('user_id', uploaderIds)

      nameById = (users ?? []).reduce((acc: Record<string, string>, u: any) => {
        acc[String(u.user_id)] = u.full_name
        return acc
      }, {})
    }

    // ── Enrich: office labels ──────────────────────────────────────────────
    const officeIds = [...new Set(
      rows.flatMap((d: any) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean)
    )]
    let officeLabelById: Record<string, string> = {}

    if (officeIds.length > 0) {
      const { data: offices } = await client
        .from('offices')
        .select('id, name, code')
        .in('id', officeIds)

      officeLabelById = (offices ?? []).reduce((acc: Record<string, string>, o: any) => {
        acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name
        return acc
      }, {})
    }

    const enriched = rows.map((doc: any) => ({
      ...doc,
      uploader_name:    nameById[String(doc.user_id)] ?? null,
      office_label:     doc.office_id         ? (officeLabelById[String(doc.office_id)]         ?? null) : null,
      origin_label:     doc.origin_office_id  ? (officeLabelById[String(doc.origin_office_id)]  ?? null) : null,
      current_label:    doc.current_office_id ? (officeLabelById[String(doc.current_office_id)] ?? null) : null,
      // Convenience flag for employee LOCAL views
      is_own_upload:    String(doc.user_id) === String(actor.userId),
    }))

    return {
      success: true,
      scope,
      org_id:  actor.orgId,
      role:    actor.userRole,
      total:   enriched.length,
      data:    enriched,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message:    error.message    || 'Internal Server Error',
    })
  }
})
