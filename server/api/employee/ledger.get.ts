import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices, parseScope } from '~~/server/utils/actorContext'
import { applyListVisibility } from '~~/server/utils/documentAccess'

/**
 * GET /api/employee/ledger
 *
 * Dual-perspective document audit trail for the employee workspace.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ scope=GLOBAL  │  Big Picture  — every document in the entire organisation │
 * │               │  (same macro view as a client admin).                     │
 * │               │  Enriched with: tracking_status, uploader name,           │
 * │               │  origin/current office labels, is_own_upload flag.        │
 * ├───────────────────────────────────────────────────────────────────────────┤
 * │ scope=LOCAL   │  Small Picture — isolated ledger:                         │
 * │               │  docs uploaded by THIS employee  OR  docs whose           │
 * │               │  origin/current/office_id sits inside one of their        │
 * │               │  assigned sub-office branches.                            │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Security:
 *   org_id is ALWAYS resolved from the session — never from query params.
 *   userId query param is accepted for convenience but validated against the
 *   session cookie.
 *
 * Query params:
 *   scope   'GLOBAL' | 'LOCAL'   default 'LOCAL'  (employees default to local view)
 *   limit   number               default 50, max 200
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query  = getQuery(event)

  // LOCAL is the default for the ledger (personal/office view)
  const scope = parseScope(query.scope as string | undefined ?? 'LOCAL')
  const limit = Math.min(Number(query.limit ?? 50), 200)

  // ── Resolve actor context (org_id from DB, never from query) ────────────
  const actor = await resolveActorContextWithOffices(event, client)

  // ── GLOBAL scope — Big Picture ───────────────────────────────────────────
  // Return every document in the organisation, enriched with full metadata.
  // This mirrors the client admin's view so the employee can see macro flow.
  if (scope === 'GLOBAL') {
    const { data: allDocs, error: allDocsErr } = await client
      .from('documents')
      .select(
        'id, org_id, title, description, status, tracking_status, current_step, ' +
        'qr_code_data, office_id, origin_office_id, current_office_id, ' +
        'stage_id, created_at, user_id, creator_role, priority, target_completion_date, ' +
        'assigned_messenger_id, checkpoint_cleared_step',
      )
      .eq('org_id', actor.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (allDocsErr) {
      throw createError({ statusCode: 500, message: allDocsErr.message })
    }

    const rows = allDocs ?? []

    // Resolve uploader + assigned messenger names in one pass
    const peopleIds = [...new Set([
      ...rows.map((d: any) => d.user_id),
      ...rows.map((d: any) => d.assigned_messenger_id),
    ].filter(Boolean))]
    let nameById: Record<string, string> = {}
    if (peopleIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('user_id, full_name')
        .in('user_id', peopleIds)
      nameById = (users ?? []).reduce((acc: Record<string, string>, u: any) => {
        acc[String(u.user_id)] = u.full_name
        return acc
      }, {})
    }

    // Resolve office labels in one query across all three FK columns
    const allOfficeIds = [...new Set(
      rows.flatMap((d: any) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean),
    )]
    let officeLabelById: Record<string, string> = {}
    if (allOfficeIds.length > 0) {
      const { data: offices } = await client
        .from('offices')
        .select('id, name, code')
        .in('id', allOfficeIds)
      officeLabelById = (offices ?? []).reduce((acc: Record<string, string>, o: any) => {
        acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name
        return acc
      }, {})
    }

    const enriched = rows.map((doc: any) => ({
      ...doc,
      uploader_name:   nameById[String(doc.user_id)] ?? null,
      messenger_name:  doc.assigned_messenger_id ? (nameById[String(doc.assigned_messenger_id)] ?? null) : null,
      office_label:    doc.office_id         ? (officeLabelById[String(doc.office_id)]         ?? null) : null,
      origin_label:    doc.origin_office_id  ? (officeLabelById[String(doc.origin_office_id)]  ?? null) : null,
      current_label:   doc.current_office_id ? (officeLabelById[String(doc.current_office_id)] ?? null) : null,
      is_own_upload:   String(doc.user_id) === String(actor.userId),
      // current_office_id is the ONLY field that tracks live location — it's
      // updated on every dropoff. office_id is set once at creation to the
      // origin office and never changes again, so matching against it would
      // wrongly keep showing a document to staff at its origin office forever,
      // even after it has physically moved on to somewhere else.
      // tracking_status !== 'CREATED' excludes a co-worker's freshly registered
      // document — current_office_id is set to the origin office the instant
      // it's created (before anyone has picked it up), which would otherwise
      // make it show up for every other staffer at that same office even
      // though it was never actually handed/dropped off to them.
      is_at_my_office: doc.tracking_status !== 'CREATED' &&
        actor.officeIds.some((id: string) => String(id) === String(doc.current_office_id)),
    }))

    // Office visibility rule: full rows only where the employee has access,
    // "Released" stubs for offices the document already left.
    const visible = await applyListVisibility(actor, enriched as any[])
    return {
      success: true,
      scope: 'GLOBAL',
      org_id: actor.orgId,
      total:  visible.length,
      data:   visible,
    }
  }

  // ── LOCAL scope — Small Picture ──────────────────────────────────────────
  // Strictly scoped to this employee's assigned offices + their own uploads.
  // This is the isolated ledger view — no other employee's data crosses in.

  // Build document filter
  let docQuery = client
    .from('documents')
    .select(
      'id, org_id, title, description, status, tracking_status, current_step, ' +
      'qr_code_data, office_id, origin_office_id, current_office_id, ' +
      'stage_id, created_at, user_id, creator_role, priority, target_completion_date, ' +
      'assigned_messenger_id, checkpoint_cleared_step',
    )
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (actor.officeIds.length > 0) {
    // Own uploads OR any doc touching one of the employee's offices
    const officeList = actor.officeIds.join(',')
    docQuery = docQuery.or(
      `user_id.eq.${actor.userId},` +
      `origin_office_id.in.(${officeList}),` +
      `current_office_id.in.(${officeList}),` +
      `office_id.in.(${officeList})`,
    )
  } else {
    // No assigned offices — only own uploads
    docQuery = docQuery.eq('user_id', actor.userId)
  }

  const { data: documents, error: docError } = await docQuery
  if (docError) {
    throw createError({ statusCode: 500, message: docError.message })
  }

  // Resolve office labels
  const uniqueOfficeIds = [...new Set(
    (documents ?? []).flatMap((d: any) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean),
  )]
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

  // Resolve assigned messenger names
  const messengerIds = [...new Set((documents ?? []).map((d: any) => d.assigned_messenger_id).filter(Boolean))]
  let messengerNameById: Record<string, string> = {}
  if (messengerIds.length > 0) {
    const { data: messengerRows } = await client.from('users').select('user_id, full_name').in('user_id', messengerIds)
    messengerNameById = (messengerRows ?? []).reduce((acc: Record<string, string>, u: any) => {
      acc[String(u.user_id)] = u.full_name
      return acc
    }, {})
  }

  const enriched = (documents ?? []).map((doc: any) => ({
    ...doc,
    messenger_name: doc.assigned_messenger_id ? (messengerNameById[String(doc.assigned_messenger_id)] ?? null) : null,
    office_label:  doc.office_id        ? (officeNameById[String(doc.office_id)]        ?? `Office #${doc.office_id}`) : null,
    origin_label:  doc.origin_office_id ? (officeNameById[String(doc.origin_office_id)] ?? null)                        : null,
    current_label: doc.current_office_id? (officeNameById[String(doc.current_office_id)]?? null)                        : null,
    is_own_upload: String(doc.user_id) === String(actor.userId),
    // Own uploads OR the document's live location is one of the actor's
    // offices — current_office_id is the only field that tracks where a
    // document physically is right now (updated on every dropoff). office_id
    // is pinned to the origin office at creation and never changes, so it's
    // deliberately excluded here — matching it would keep showing a document
    // to origin-office staff forever, even after it moved on elsewhere.
    // tracking_status !== 'CREATED' excludes a co-worker's freshly registered
    // document — current_office_id is already set to the origin office at
    // creation time, before anyone has picked it up, which isn't a real
    // "dropped off to this office" event yet.
    is_at_my_office: doc.tracking_status !== 'CREATED' &&
      actor.officeIds.some((id) => String(id) === String(doc.current_office_id)),
  }))

  const visible = await applyListVisibility(actor, enriched as any[])
  return {
    success: true,
    scope:   'LOCAL',
    org_id:  actor.orgId,
    total:   visible.length,
    data:    visible,
  }
})
