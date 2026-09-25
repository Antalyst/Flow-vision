import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcrypt-ts'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { logActivityForEvent } from '~~/server/utils/activityLog'
import { computeAgeFields, resolveOrCreateOffice, linkOfficeOwnerIfNew } from '~~/server/utils/employeeProvisioning'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Only organization administrators can create employee accounts' })
  }

  const body = await readBody(event)
  const { full_name, email, password, birth_date, office_id, office_name } = body

  if (!full_name?.trim() || !email?.trim() || !password?.trim() || !birth_date) {
    throw createError({ statusCode: 400, message: 'full_name, email, password, and birth_date are required' })
  }
  if (String(password).length < 8) {
    throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
  }

  const ageFields = computeAgeFields(birth_date)
  if (!ageFields) throw createError({ statusCode: 400, message: 'Invalid birth date' })

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)

  const { data: existingEmail } = await admin
    .from('users')
    .select('user_id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existingEmail) {
    throw createError({ statusCode: 409, message: 'An account with this email address already exists' })
  }

  const office = await resolveOrCreateOffice(admin, {
    orgId: actor.orgId,
    officeId: office_id || null,
    officeName: office_name || null,
    createdBy: actor.userId,
  })

  const hashedPassword = await hash(password, 10)

  const { data: newEmployee, error: userError } = await admin
    .from('users')
    .insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'employee',
      org_id: actor.orgId,
      office_id: office.id,
      birth_date,
      birth_year: ageFields.birthYear,
      age: ageFields.age,
      status: 1,
    })
    .select('user_id, full_name, email, role, status, office_id, birth_date, created_at')
    .single()

  if (userError || !newEmployee) {
    throw createError({ statusCode: 500, message: userError?.message || 'Failed to create employee account' })
  }

  await linkOfficeOwnerIfNew(admin, office, newEmployee.user_id)

  await logActivityForEvent(event, client, {
    actionType: 'system',
    details: `Created employee "${newEmployee.full_name}" under office "${office.name}"${office.created ? ' (new office)' : ''}.`,
    message: `Added employee "${newEmployee.full_name}"`,
    officeId: office.id,
  })

  return {
    success: true,
    message: office.created
      ? `Employee "${newEmployee.full_name}" created under new office "${office.name}"`
      : `Employee "${newEmployee.full_name}" created under "${office.name}"`,
    data: { ...newEmployee, office_name: office.name },
  }
})
