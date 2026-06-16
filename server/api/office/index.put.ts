export default defineEventHandler(async (event) => {
  try {
    const client = useServerSupabase()
    const body = await readBody(event)
    const { id, name, assigned_user, stage_id, code } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'id is required to update an office',
      })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (assigned_user !== undefined) updateData.assigned_user = assigned_user
    if (stage_id !== undefined) updateData.stage_id = stage_id
    if (code !== undefined && (code ?? '').trim()) updateData.code = code.trim()

    const { data, error } = await client
      .from('offices')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Error updating office',
      })
    }

    return {
      success: true,
      message: 'Office updated successfully',
      data
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error',
    })
  }
})
