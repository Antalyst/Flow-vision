import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase creds in env')
  process.exit(1)
}

const client = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('Fetching users...')
  const { data: users } = await client.from('users').select('*').limit(10)
  
  const employee = users?.find(u => u.role?.toLowerCase() === 'employee')
  if (!employee) {
    console.log('No employee found')
    return
  }
  
  console.log('Found employee:', employee.user_id, employee.org_id)
  
  // Find their offices
  const { data: userOffices } = await client.from('user_offices').select('office_id').eq('user_id', employee.user_id)
  const officeIds = userOffices?.map(uo => uo.office_id) || []
  console.log('Offices:', officeIds)
  
  // Simulate queue.get.ts logic
  let dbQuery = client
    .from('documents')
    .select(
      'id, title, description, status, tracking_status, current_step, stage_id, ' +
      'office_id, origin_office_id, current_office_id, qr_code_data, ' +
      'checkpoint_cleared_step, assigned_messenger_id, created_at, user_id, creator_role'
    )
    .eq('org_id', employee.org_id)
    .order('created_at', { ascending: false })
    .limit(300)
    
  if (officeIds.length === 0) {
    dbQuery = dbQuery.eq('user_id', employee.user_id)
  } else {
    const officeList = officeIds.join(',')
    dbQuery = dbQuery.or(
      `user_id.eq.${employee.user_id},` +
      `current_office_id.in.(${officeList}),` +
      `origin_office_id.in.(${officeList}),` +
      `office_id.in.(${officeList})`
    )
  }
  
  console.log('Executing query...')
  const { data: docs, error } = await dbQuery
  
  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log(`Success! Found ${docs?.length || 0} docs`)
    fs.writeFileSync('TEST_QUEUE_OUT.json', JSON.stringify(docs, null, 2))
  }
}

test()
