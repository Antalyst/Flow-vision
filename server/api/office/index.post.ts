import {serverSupabaseClient} from '#supabase/server'
export default defineEventHandler(async (event) => {
  try {

    const client = await serverSupabaseClient(event)
    const body = await readBody(event);
    const { name, user_id, org_id , stage_id} = body;

    // const db = event.context.db;

    if (!name || !org_id || !user_id) {

      return {
        status: 400,
        message: `Missing required fields: ${!name ? 'name ' : ''}${!org_id ? 'org_id ' : ''}${!user_id ? 'user_id' : ''}`
      }
    }
    const { data: rows, error } = await client.from('offices').insert({
      name,
      assigned_user: user_id,
      org_id,
      stage_id: stage_id ?? null,
    }).select('*').single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to create office',
      })
    }

    return {
      status: 200,
      success: true,
      message: 'Office created successfully',
      data: rows,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }

})