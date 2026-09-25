import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event)
    const query = getQuery(event)
    const id = query.id

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'id is required to delete an office',
      })
    }

    // Historical/log records reference office_id but shouldn't block deletion —
    // clear the reference (keeping the record itself) rather than losing the
    // audit trail. Live business relationships (documents, stage_steps, users,
    // stages) are intentionally NOT cleared here: those FK violations are a
    // real signal that the office is still in active use and must be
    // reassigned before it can be deleted.
    await Promise.all([
      client.from('activity_logs').update({ office_id: null }).eq('office_id', id),
      client.from('notifications').update({ office_id: null }).eq('office_id', id),
      client.from('document_tracking_events').update({ office_id: null }).eq('office_id', id),
    ])

    const { data, error } = await client
      .from('offices')
      .delete()
      .eq('id', id)
      .select('*')

    if (error) {
      if (error.code === '23503') {
        throw createError({
          statusCode: 409,
          message: 'This office still has documents or team members assigned to it. Reassign them before deleting this office.',
        })
      }
      throw createError({
        statusCode: 500,
        message: 'We could not delete this office. Please try again.',
      })
    }

    return {
      success: true,
      message: 'Office deleted successfully',
      data
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
