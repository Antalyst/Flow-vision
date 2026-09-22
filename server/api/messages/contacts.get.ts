import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  // Fetch all offices in the same org
  const { data: offices, error: officesErr } = await client
    .from('offices')
    .select('id, name')
    .eq('org_id', actor.orgId)

  if (officesErr) {
    throw createError({ statusCode: 500, message: officesErr.message })
  }

  // Fetch all people in the same org too — a "contact" isn't just an office.
  const { data: users, error: usersErr } = await client
    .from('users')
    .select('user_id, full_name')
    .eq('org_id', actor.orgId)

  if (usersErr) {
    throw createError({ statusCode: 500, message: usersErr.message })
  }

  const contacts = [
    ...(users || []).map((u: any) => ({
      id: u.user_id,
      type: 'user',
      name: u.full_name || 'User',
      role: 'user'
    })),
    ...(offices || []).map((o: any) => ({
      id: o.id,
      type: 'office',
      name: o.name,
      role: 'office'
    }))
  ]

  // Exclude the actor themself and their own office(s)
  const filteredContacts = contacts.filter(c => {
    if (c.type === 'office' && actor.officeIds.includes(c.id)) return false
    if (c.type === 'user' && String(c.id) === String(actor.userId)) return false
    return true
  })

  return { success: true, data: filteredContacts }
})
