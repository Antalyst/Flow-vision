// server/api/test/index.get.ts

export default eventHandler(async (event) => {
  const client = useServerSupabase()

  const { data, error } = await client
    .from('account_types')
    .select('*')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { sensitiveData: data }
})
