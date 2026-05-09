import { serverSupabaseClient } from '#supabase/server'
import { randomBytes } from 'node:crypto'
import { logActivityForEvent } from '~~/server/utils/activityLog'

/** Generates a human-readable short code: OFF-XXXXXX */
const generateOfficeCode = (): string =>
  'OFF-' + randomBytes(3).toString('hex').toUpperCase()


export default defineEventHandler(async (event) => {

  try {
    const client = await serverSupabaseClient(event)
    const body = await readBody(event)
    const { name, user_id, org_id, stage_id, code } = body

    if (!name || !org_id || !user_id) {
      return {
        status: 400,
        message: `Missing required fields: ${!name ? 'name ' : ''}${!org_id ? 'org_id ' : ''}${!user_id ? 'user_id' : ''}`,
      }
    }


    // const [rows] = await db.query(`
    //         insert into offices (name, assigned_user, org_id, created_at) values (?, ?, ?, ?)
    //     `, [name, user_id, org_id, created_at]);

    const officeCode = (code ?? '').trim() || generateOfficeCode()

    // created_by: the user_id of whoever provisioned this office (employee or admin)
    const createdBy = getCookie(event, 'user_session') || user_id

    const { data: rows, error } = await client
      .from('offices')
      .insert({
        name,
        assigned_user: user_id,
        org_id,
        stage_id: stage_id ?? null,
        code: officeCode,
        created_by: createdBy,
      })
      .select('*')
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to create office',
      })
    }

    await logActivityForEvent(event, client, {
      actionType: 'system',
      details: `Created office "${name}" (${officeCode}).`,
      message: `Created office "${name}"`,
      officeId: rows?.id ?? null,
      metadata: { office_code: officeCode, assigned_user: user_id },
    })

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
