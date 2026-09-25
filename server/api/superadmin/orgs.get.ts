import { getSuperadminDb, requireSuperadmin } from '~~/server/utils/superadminContext'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const db = getSuperadminDb()

  const { data, error } = await db
    .from('org')
    .select('org_id, name, code, created_at')
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true, data: data ?? [] }
})
