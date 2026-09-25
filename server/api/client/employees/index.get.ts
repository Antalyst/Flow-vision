import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { resolveActorContext } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Only organization administrators can view employee accounts' })
  }

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data, error } = await admin
    .from('users')
    .select('user_id, full_name, email, role, status, office_id, birth_date, created_at')
    .eq('org_id', actor.orgId)
    .eq('role', 'employee')
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  const rows = data ?? []
  const officeIds = [...new Set(rows.map((u) => u.office_id).filter(Boolean))]
  const { data: offices } = officeIds.length
    ? await admin.from('offices').select('id, name, code').in('id', officeIds)
    : { data: [] as { id: string; name: string; code: string }[] }
  const officeById = Object.fromEntries((offices ?? []).map((o) => [o.id, o]))

  const enriched = rows.map((u) => ({
    ...u,
    office_name: u.office_id ? officeById[u.office_id]?.name ?? null : null,
    office_code: u.office_id ? officeById[u.office_id]?.code ?? null : null,
  }))

  return { success: true, data: enriched }
})
