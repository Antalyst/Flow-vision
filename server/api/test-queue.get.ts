import { serverSupabaseClient } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  
  // Fake actor context
  const actor = {
    orgId: "38bc22",
    userId: "e3f171", // Assume these have some format
  }
  
  let dbQuery = client
    .from('documents')
    .select('id, title, status, tracking_status, current_step, stage_id, office_id, origin_office_id, current_office_id, user_id')
    //.eq('org_id', actor.orgId)
    .limit(300)

  const officeList = 'e3f171' 
  dbQuery = dbQuery.or(
    `user_id.eq.${actor.userId},` +
    `current_office_id.in.(${officeList}),` +
    `origin_office_id.in.(${officeList}),` +
    `office_id.in.(${officeList})`
  )

  const { data, error } = await dbQuery

  return {
    error: error ? error.message : null,
    data
  }
})
