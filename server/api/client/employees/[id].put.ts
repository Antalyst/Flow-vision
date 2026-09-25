import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcrypt-ts'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { computeAgeFields, resolveOrCreateOffice } from '~~/server/utils/employeeProvisioning'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Only organization administrators can edit employee accounts' })
  }

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing employee ID' })

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data: target } = await admin.from('users').select('user_id, org_id, role').eq('user_id', id).single()
  if (!target || String(target.org_id) !== String(actor.orgId) || target.role !== 'employee') {
    throw createError({ statusCode: 403, message: 'Forbidden: cannot edit this account' })
  }

  const body = await readBody(event)
  const { full_name, email, birth_date, office_id, office_name, password } = body

  if (!full_name?.trim() || !email?.trim() || !birth_date) {
    throw createError({ statusCode: 400, message: 'full_name, email, and birth_date are required' })
  }

  const ageFields = computeAgeFields(birth_date)
  if (!ageFields) throw createError({ statusCode: 400, message: 'Invalid birth date' })

  const { data: existingEmail } = await admin
    .from('users')
    .select('user_id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existingEmail && String(existingEmail.user_id) !== String(id)) {
    throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
  }

  const office = await resolveOrCreateOffice(admin, {
    orgId: actor.orgId,
    officeId: office_id || null,
    officeName: office_name || null,
    createdBy: actor.userId,
  })

  const updatePayload: Record<string, unknown> = {
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    office_id: office.id,
    birth_date,
    birth_year: ageFields.birthYear,
    age: ageFields.age,
  }

  if (password && String(password).trim()) {
    if (String(password).length < 8) {
      throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
    }
    updatePayload.password = await hash(String(password), 10)
  }

  const { data: updated, error } = await admin
    .from('users')
    .update(updatePayload)
    .eq('user_id', id)
    .select('user_id, full_name, email, role, status, office_id, birth_date, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message || 'Failed to update employee' })

  return { success: true, data: { ...updated, office_name: office.name } }
})
