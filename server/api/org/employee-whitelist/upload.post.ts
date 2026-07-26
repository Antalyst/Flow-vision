import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const formData = await readMultipartFormData(event)
  
  const client = createClient(
    config.public.supabaseUrl, 
    config.supabaseServiceKey
  )

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  // We expect an org_id field and a file field
  const orgIdField = formData.find(f => f.name === 'org_id')
  const fileField = formData.find(f => f.name === 'file' && f.filename)

  if (!orgIdField) {
    throw createError({ statusCode: 400, statusMessage: 'Organization ID is required' })
  }
  const org_id = orgIdField.data.toString()

  if (!fileField) {
    throw createError({ statusCode: 400, statusMessage: 'CSV file is required' })
  }

  const csvText = fileField.data.toString('utf-8')
  const rows = csvText.split(/\r?\n/).filter(row => row.trim() !== '')

  if (rows.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'CSV must contain headers and at least one row of data' })
  }

  // Parse Headers
  const headers = rows[0].split(',').map(h => h.trim().toLowerCase())
  const idIndex = headers.indexOf('employee_id')
  const nameIndex = headers.indexOf('full_name')
  const emailIndex = headers.indexOf('email')

  if (idIndex === -1) {
    throw createError({ statusCode: 400, statusMessage: 'CSV must contain an "employee_id" column' })
  }

  const inserts = []

  for (let i = 1; i < rows.length; i++) {
    // Basic CSV row parsing (ignores quotes for now, assuming simple comma separation)
    // A robust regex for CSV can handle commas in quotes, but we'll stick to a simple split for standard IDs
    const row = rows[i]
    
    // A simple regex to split by comma, respecting quotes
    const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim())
    
    const employee_id = columns[idIndex]
    if (!employee_id) continue;

    inserts.push({
      org_id,
      employee_id_number: employee_id,
      full_name: nameIndex !== -1 ? (columns[nameIndex] || null) : null,
      email: emailIndex !== -1 ? (columns[emailIndex] || null) : null,
    })
  }

  if (inserts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid data found in CSV' })
  }

  try {
    // Delete existing entries for this org to do a full replace (as specified in implementation plan)
    // Or we can just upsert. The prompt says "Upsert records into org_employee_whitelists".
    // Supabase supports upsert, but requires knowing the constraint. The constraint is uk_org_employee_id.
    const { data, error } = await client
      .from('org_employee_whitelists')
      .upsert(inserts, { onConflict: 'org_id, employee_id_number' })

    if (error) {
      throw error
    }

    return { success: true, message: `Successfully uploaded ${inserts.length} whitelist entries.` }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error processing whitelist CSV',
    })
  }
})
