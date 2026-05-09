import {serverSupabaseClient} from '#supabase/server'
export default defineEventHandler(async (event) => {
  try {

    const client = await serverSupabaseClient(event)
    const body = await readBody(event);
    const { name, user_id, org_id , stage_id} = body;

    // const db = event.context.db;

    if (!name || !org_id || !user_id || !stage_id) {

      return {
        status: 400,
        message: `Missing required fields: ${!name ? 'name ' : ''}${!org_id ? 'org_id ' : ''}${!user_id ? 'user_id' : ''}${!stage_id ? 'stage_id' : ''}`
      }
    }
     const { data: rows, error } = await client.from('offices').insert({
      name,
      assigned_user: user_id,
      org_id,
      stage_id,
    }).select('*').single();
    
    // const [rows] = await db.query(`
    //         insert into offices (name, assigned_user, org_id, created_at) values (?, ?, ?, ?)
    //     `, [name, user_id, org_id, created_at]);

    if (rows) {
      return {
        status: 200,
        message: "Office created successfully",
        data: rows
      }
    }
  } catch (error) {
    return error;
  }

})