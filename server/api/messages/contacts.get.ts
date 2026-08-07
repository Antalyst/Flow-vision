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

  const contacts = [
    ...(offices || []).map((o: any) => ({
      id: o.id,
      type: 'office',
      name: o.name,
      role: 'office'
    }))
  ]

  // Exclude current actor's own office if applicable
  const filteredContacts = contacts.filter(c => {
    if (c.type === 'office' && actor.officeIds.includes(c.id)) return false
    return true
  })

  return { success: true, data: filteredContacts }
})
