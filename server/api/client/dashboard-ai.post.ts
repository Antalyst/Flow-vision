import { serverSupabaseClient } from '#supabase/server'
import { resolveActorContext } from '~~/server/utils/actorContext'
import Groq from 'groq-sdk'

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST')

  const client = await serverSupabaseClient(event)
  const actor = await resolveActorContext(event, client)

  if (actor.userRole.toLowerCase() !== 'client') {
    throw createError({ statusCode: 403, message: 'Only client accounts can access the organisation dashboard.' })
  }

  const body = await readBody(event)
  const { metrics, officeName } = body

  if (!metrics) {
    throw createError({ statusCode: 400, message: 'Missing metrics context.' })
  }

  const { data: rawEvents } = await client
    .from('document_tracking_events')
    .select(`
      document_id, status, created_at, office_id,
      documents (
        document_categories (
          name
        )
      ),
      offices (
        name
      )
    `)
    .eq('org_id', actor.orgId)
    .order('created_at', { ascending: true })

  const events = rawEvents || []
  const docMap = new Map()
  for (const ev of events) {
    if (!docMap.has(ev.document_id)) docMap.set(ev.document_id, [])
    docMap.get(ev.document_id).push(ev)
  }

  const categorySla: Record<string, Record<string, number[]>> = {}
  for (const evs of docMap.values()) {
    let currentArrival: Date | null = null
    let currentOfficeId: string | null = null
    
    for (const ev of evs) {
      if (ev.status === 'CREATED' || ev.status === 'ARRIVED_AT_OFFICE') {
        currentArrival = new Date(ev.created_at)
        currentOfficeId = ev.office_id
      } else if (ev.status === 'IN_TRANSIT' && currentArrival && currentOfficeId === ev.office_id) {
        const durationHours = (new Date(ev.created_at).getTime() - currentArrival.getTime()) / (1000 * 60 * 60)
        
        // @ts-ignore
        const categoryName = ev.documents?.document_categories?.name || 'Uncategorized'
        // @ts-ignore
        const officeName = ev.offices?.name || 'Unknown Office'
        
        if (!categorySla[categoryName]) categorySla[categoryName] = {}
        if (!categorySla[categoryName][officeName]) categorySla[categoryName][officeName] = []
        categorySla[categoryName][officeName].push(durationHours)
        
        currentArrival = null
        currentOfficeId = null
      }
    }
  }

  const predictiveSlaInsights = []
  for (const cat of Object.keys(categorySla)) {
    for (const off of Object.keys(categorySla[cat])) {
      const durations = categorySla[cat][off]
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      predictiveSlaInsights.push({
        category: cat,
        office: off,
        average_processing_hours: Number(avg.toFixed(1)),
        samples: durations.length
      })
    }
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const systemInstruction = `
    You are an intelligent AI Executive Assistant for FlowVision workspace operations. 
    You are tasked with providing a concise, high-level summary of the current dashboard metrics.
    
    CRITICAL FORMATTING RULES:
    1. Output a beautiful, scannable executive digest.
    2. Use clean, professional headers (e.g., ### 📈 Executive Summary for ${officeName ? officeName : 'All Offices'}) to start the document.
    3. Use small subheadings WITH emojis (e.g., ### ⏱️ Predictive SLA Insights, ### 🔍 System Action Items) to visually separate distinct core sections.
    4. Speak like a helpful, grounded human office supervisor. Use professional, encouraging plain language.
    5. Strip away all developer or backend database jargon (do not say "JSON", "metrics payload", "database arrays").
    6. Bold critical operational objects only (like **Office Names**, **Stage Names**, or **Categories**).
    7. Enforce clean double-line breaks between paragraph blocks to ensure maximum whitespace readability.
    
    Here is the live operational data snapshot:
    ${JSON.stringify(metrics)}

    Here is the Predictive SLA Insights Matrix (Processing velocities grouped by category and office):
    ${JSON.stringify(predictiveSlaInsights)}
    
    Make sure to analyze the Predictive SLA Insights and include a dedicated section titled "### ⏱️ Predictive SLA Insights" discussing category bottlenecks or efficiencies.
  `

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Please write my executive digest for ${officeName ? officeName : 'the entire organization'}.` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
    })

    return {
      success: true,
      narrative: completion.choices[0]?.message?.content?.trim() || 'Digest generation failed.'
    }
  } catch (error: any) {
    console.error('[Dashboard AI] generation failed:', error)
    return {
      success: false,
      narrative: 'I am currently unable to process the executive digest due to a system interruption. Please try again.',
      debugError: error?.message || String(error)
    }
  }
})
