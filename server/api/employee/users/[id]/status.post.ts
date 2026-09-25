import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { createClient } from '@supabase/supabase-js'

const MANAGED_ROLES = ['employee_sub_user', 'messenger']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'employee') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const id = event.context.params?.id
  const body = await readBody(event)
  const { status } = body

  if (!id || status === undefined || status === null) {
    throw createError({ statusCode: 400, message: 'id and status are required' })
  }

  const adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data: target } = await adminClient.from('users').select('org_id, role, full_name').eq('user_id', id).single()
  if (!target || target.org_id !== actor.orgId || !MANAGED_ROLES.includes(target.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden: Tenant boundary mismatch' })
  }

  const { data: updated, error } = await adminClient
    .from('users')
    .update({ status: Number(status) })
    .eq('user_id', id)
    .select('user_id, full_name, status')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to update status' })

  return {
    success: true,
    message: `${updated.full_name} is now ${Number(status) === 1 ? 'active' : 'inactive'}`,
    data: updated,
  }
})
