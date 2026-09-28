import { randomUUID } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'
import { canManageDesk } from '~~/server/utils/deskAccess'
import { logActivitySafe } from '~~/server/utils/activityLog'

/**
 * POST /api/desks
 *
 * Creates a desk inside an office the caller owns/is assigned to (client
 * admins may create a desk in any office in their organisation).
 *
 * Body:
 *   office_id           UUID    required
 *   name                 string  required
 *   code?                string  — auto-generated from name if omitted
 *   assigned_user_id?    UUID
 *   description?         string
 */
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (!['client', 'employee', 'employee_sub_user'].includes(actor.userRole)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to create desks.' })
  }

  const body = await readBody(event)
  const officeId = String(body?.office_id ?? '').trim()
  const name = String(body?.name ?? '').trim()
  let code = String(body?.code ?? '').trim()
  const assignedUserId = body?.assigned_user_id ? String(body.assigned_user_id).trim() : null
  const description = body?.description ? String(body.description).trim() : null

  if (!officeId) throw createError({ statusCode: 400, message: 'Please select an office for this desk.' })
  if (!name) throw createError({ statusCode: 400, message: 'Please enter a desk name.' })

  const { data: office, error: officeErr } = await client
    .from('offices')
    .select('id, name, org_id')
    .eq('id', officeId)
    .maybeSingle()

  if (officeErr) throw createError({ statusCode: 500, message: 'We could not check this office. Please try again.' })
  if (!office) throw createError({ statusCode: 404, message: 'We could not find this office.' })

  if (!canManageDesk(actor, { org_id: String(office.org_id), office_id: String(office.id) })) {
    throw createError({
      statusCode: 403,
      message: 'You can only manage desks in your assigned office.',
      data: { code: 'UNAUTHORIZED_DESK' },
    })
  }

  if (assignedUserId) {
    const { data: staffRow, error: staffErr } = await client
      .from('users')
      .select('user_id, org_id, role, status')
      .eq('user_id', assignedUserId)
      .maybeSingle()

    if (staffErr) throw createError({ statusCode: 500, message: 'We could not check this staff member. Please try again.' })
    if (!staffRow || String(staffRow.org_id) !== actor.orgId) {
      throw createError({ statusCode: 404, message: 'We could not find this staff member.' })
    }
  }

  if (!code) {
    const prefix = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').slice(0, 24) || 'DESK'
    code = `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  }

  const deskId = randomUUID()
  const qrCodeData = `flowvision://desk?id=${deskId}`

  const { data: desk, error: insertErr } = await client
    .from('desks')
    .insert({
      id: deskId,
      org_id: actor.orgId,
      office_id: officeId,
      name,
      code,
      assigned_user_id: assignedUserId,
      qr_code_data: qrCodeData,
      description,
      is_active: true,
    })
    .select('*, assigned_user:users(user_id, full_name), office:offices(id, name)')
    .single()

  if (insertErr) {
    throw createError({ statusCode: 500, message: 'We could not create this desk. Please try again.' })
  }

  const message = `${actor.fullName ?? 'An office user'} created desk "${name}" at ${office.name}.`
  await logActivitySafe({
    orgId: actor.orgId,
    officeId,
    userId: actor.userId,
    userName: actor.fullName,
    actorName: actor.fullName,
    actionType: 'system',
    details: message,
    message,
    metadata: { desk_id: deskId, desk_name: name },
  }, client)

  return { success: true, message: 'Desk created successfully.', data: desk }
})
