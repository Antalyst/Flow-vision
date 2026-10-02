import { serverSupabaseClient } from '#supabase/server'
import { validateRouteOffices } from '~~/server/utils/documentRoute'
import { assertRecurringRoutingAvailable, recurringRoutingAvailable } from '~~/server/utils/recurringRouting'

/**
 * PUT /api/stages — rename a saved route and/or replace its ordered offices.
 *
 * Body: { stage_id | id, name?, step_number?, office_ids?: string[] }
 *
 * Saved routes are templates only: every document keeps its own copy of the
 * route it was created with (document_route_stops), so editing a saved route
 * here never changes existing documents.
 */
export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)
    const { stage_id, id, name, step_number, office_ids } = body

    const targetId = stage_id || id
    const auth = requireOrgAuth(event, ['client', 'employee', 'employee_sub_user'])

    if (!targetId) {
      throw createError({
        statusCode: 400,
        message: 'stage_id or id is required to update a stage',
      })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) {
      const trimmed = String(name).trim()
      if (!trimmed) throw createError({ statusCode: 400, message: 'Please give the route a name.' })
      updateData.name = trimmed.slice(0, 120)
    }
    if (step_number !== undefined) updateData.step_number = step_number
    // routing_type only exists after the recurring migration: recurring is
    // rejected (controlled 409) before it; standard is only written after it.
    if (body?.routing_type === 'RECURRING') {
      await assertRecurringRoutingAvailable()
      updateData.routing_type = 'RECURRING'
    } else if (body?.routing_type === 'STANDARD' && await recurringRoutingAvailable()) {
      updateData.routing_type = 'STANDARD'
    }

    // Validate the new office list before touching anything.
    const newStops = Array.isArray(office_ids)
      ? await validateRouteOffices(auth.orgId, office_ids.map(String), null)
      : null

    // Ownership check doubles as the rename (org_id scoping makes another org's route a 404).
    const stageQuery = Object.keys(updateData).length
      ? client.from('stages').update(updateData)
      : client.from('stages').select('*')
    const { data, error } = await stageQuery
      .eq('stage_id', targetId)
      .eq('org_id', auth.orgId)
      .select('*')
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error updating stage',
      })
    }
    if (!data) throw createError({ statusCode: 404, message: 'Route not found.' })

    if (newStops) {
      const { error: delErr } = await client.from('stage_steps').delete().eq('stage_id', targetId)
      if (delErr) throw createError({ statusCode: 500, message: 'We could not update this route. Please try again.' })
      const { error: insErr } = await client.from('stage_steps').insert(
        newStops.map((s) => ({ stage_id: targetId, office_id: s.office_id, step_number: s.step_number, org_id: auth.orgId })),
      )
      if (insErr) throw createError({ statusCode: 500, message: 'We could not save the route offices. Please try again.' })
    }

    return {
      success: true,
      message: 'Stage updated successfully',
      data
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
