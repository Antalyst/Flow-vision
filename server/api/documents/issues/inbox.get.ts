import { serverSupabaseClient } from '#supabase/server'
import { ISSUE_ALLOWED_ROLES } from '~~/server/utils/documentIssues'
import { resolveActorContextWithOffices } from '~~/server/utils/actorContext'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContextWithOffices(event, client)

  if (!(ISSUE_ALLOWED_ROLES as readonly string[]).includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden: only client or employee accounts may view compliance logs.',
    })
  }

  // Fetch all issues for the org
  const { data: issues, error } = await client
    .from('document_issues')
    .select(`
      id,
      document_id,
      org_id,
      reported_by_office_id,
      target_office_id,
      issue_type,
      title,
      details,
      status,
      created_at,
      documents (
        id,
        title,
        qr_code_data,
        origin_office_id,
        current_office_id,
        office_id
      ),
      document_messages (
        id,
        sender_id,
        message_text,
        created_at
      )
    `)
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const officeSet = new Set(actor.officeIds.map(String))

  // Filter issues visible to this actor
  const rows = (issues ?? []).filter((row) => {
    if (actor.userRole === 'client') return true

    const doc = (row as any).documents

    const relatedOffices = [
      row.reported_by_office_id,
      row.target_office_id,
      doc?.origin_office_id,
      doc?.current_office_id,
      doc?.office_id,
    ]
      .filter(Boolean)
      .map(String)

    return relatedOffices.some((id) => officeSet.has(id))
  })

  // Format the response with the latest message
  const inbox = rows.map((row: any) => {
    const msgs = row.document_messages || []
    msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const latestMessage = msgs.length > 0 ? msgs[0] : null

    return {
      id: row.id,
      document_id: row.document_id,
      title: row.title,
      status: row.status,
      created_at: row.created_at,
      document_title: row.documents?.title || 'Unknown Document',
      document_qr: row.documents?.qr_code_data || '',
      reported_by_office_id: row.reported_by_office_id,
      target_office_id: row.target_office_id,
      latest_message: latestMessage ? {
        text: latestMessage.message_text,
        created_at: latestMessage.created_at,
        sender_id: latestMessage.sender_id
      } : null
    }
  })

  // Sort by the most recent message or issue creation
  inbox.sort((a, b) => {
    const timeA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : new Date(a.created_at).getTime()
    const timeB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : new Date(b.created_at).getTime()
    return timeB - timeA
  })
  
  // Collect office IDs to fetch their names
  const officeIds = new Set<string>()
  for (const row of inbox) {
    if (row.reported_by_office_id) officeIds.add(String(row.reported_by_office_id))
    if (row.target_office_id) officeIds.add(String(row.target_office_id))
  }
  
  let officeMap: Record<string, string> = {}
  if (officeIds.size > 0) {
    const { data: offices } = await client
      .from('offices')
      .select('id, name')
      .in('id', [...officeIds])

    officeMap = (offices ?? []).reduce(
      (acc, o) => {
        acc[o.id] = o.name
        return acc
      },
      {} as Record<string, string>,
    )
  }
  
  for (const row of inbox) {
    (row as any).reported_by_office_name = officeMap[row.reported_by_office_id] || 'Unknown Office';
    (row as any).target_office_name = row.target_office_id ? (officeMap[row.target_office_id] || 'Unknown Office') : null;
  }

  return { success: true, data: inbox }
})
