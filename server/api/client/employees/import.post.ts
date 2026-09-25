import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcrypt-ts'
import { resolveActorContext } from '~~/server/utils/actorContext'
import { logActivityForEvent } from '~~/server/utils/activityLog'
import { computeAgeFields, resolveOrCreateOffice } from '~~/server/utils/employeeProvisioning'

interface ImportRowResult {
  row: number
  email: string
  status: 'created' | 'skipped'
  message: string
}

const REQUIRED_COLUMNS = ['full_name', 'email', 'password', 'birth_date', 'office_name'] as const

/** Splits a CSV row on commas while respecting quoted fields — mirrors the
 * parser already used by /api/org/employee-whitelist/upload. */
function splitCsvRow(row: string): string[] {
  return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((col) => col.replace(/^"|"$/g, '').trim())
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole !== 'client') {
    throw createError({ statusCode: 403, message: 'Only organization administrators can import employee accounts' })
  }

  const formData = await readMultipartFormData(event)
  const fileField = formData?.find((f) => f.name === 'file' && f.filename)
  if (!fileField) throw createError({ statusCode: 400, message: 'CSV file is required' })

  const csvText = fileField.data.toString('utf-8')
  const lines = csvText.split(/\r?\n/).filter((row) => row.trim() !== '')

  if (lines.length < 2) {
    throw createError({ statusCode: 400, message: 'CSV must contain a header row and at least one data row' })
  }

  const headers = splitCsvRow(lines[0]).map((h) => h.toLowerCase())
  const colIndex = Object.fromEntries(REQUIRED_COLUMNS.map((key) => [key, headers.indexOf(key)])) as Record<typeof REQUIRED_COLUMNS[number], number>

  const missing = REQUIRED_COLUMNS.filter((key) => colIndex[key] === -1)
  if (missing.length) {
    throw createError({
      statusCode: 400,
      message: `CSV is missing required column(s): ${missing.join(', ')}. Download the template to see the exact format.`,
    })
  }

  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey)
  const results: ImportRowResult[] = []
  let createdCount = 0

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1 // 1-based; header occupies row 1
    const cols = splitCsvRow(lines[i])

    const full_name = cols[colIndex.full_name] || ''
    const email = (cols[colIndex.email] || '').trim().toLowerCase()
    const password = cols[colIndex.password] || ''
    const birth_date = cols[colIndex.birth_date] || ''
    const office_name = cols[colIndex.office_name] || ''

    if (!full_name || !email || !password || !birth_date || !office_name) {
      results.push({ row: rowNum, email: email || '(blank)', status: 'skipped', message: 'Missing one or more required fields' })
      continue
    }
    if (password.length < 8) {
      results.push({ row: rowNum, email, status: 'skipped', message: 'Password must be at least 8 characters' })
      continue
    }

    const ageFields = computeAgeFields(birth_date)
    if (!ageFields) {
      results.push({ row: rowNum, email, status: 'skipped', message: 'Invalid birth_date — use YYYY-MM-DD' })
      continue
    }

    const { data: existingEmail } = await admin.from('users').select('user_id').eq('email', email).maybeSingle()
    if (existingEmail) {
      results.push({ row: rowNum, email, status: 'skipped', message: 'An account with this email already exists' })
      continue
    }

    try {
      const office = await resolveOrCreateOffice(admin, {
        orgId: actor.orgId,
        officeName: office_name,
        createdBy: actor.userId,
      })

      const hashedPassword = await hash(password, 10)
      const { error: insertError } = await admin.from('users').insert({
        full_name,
        email,
        password: hashedPassword,
        role: 'employee',
        org_id: actor.orgId,
        office_id: office.id,
        birth_date,
        birth_year: ageFields.birthYear,
        age: ageFields.age,
        status: 1,
      })

      if (insertError) {
        results.push({ row: rowNum, email, status: 'skipped', message: insertError.message })
        continue
      }

      createdCount++
      results.push({ row: rowNum, email, status: 'created', message: `Added to office "${office.name}"${office.created ? ' (new office)' : ''}` })
    } catch (err: any) {
      results.push({ row: rowNum, email, status: 'skipped', message: err?.message || 'Failed to create account' })
    }
  }

  if (createdCount > 0) {
    await logActivityForEvent(event, client, {
      actionType: 'system',
      details: `Bulk-imported ${createdCount} employee account(s) via CSV.`,
      message: `Imported ${createdCount} employee(s) via CSV`,
    })
  }

  return {
    success: true,
    message: `${createdCount} of ${lines.length - 1} row(s) imported successfully`,
    created: createdCount,
    total: lines.length - 1,
    results,
  }
})
