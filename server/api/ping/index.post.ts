import { defineEventHandler, readMultipartFormData, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find((item) => item.name === 'file' && item.filename)

  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: "No file provided." })
  }

  try {
    const text = await extractTextFromFile({ 
      filename: file.filename || '', 
      data: file.data 
    })

    if (text.length < 5) {
      throw new Error("Document content is too short or unreadable.")
    }

    const result = await analyzeDocument(text)
    return result

  } catch (err: any) {
    console.error('[ping] Error:', err.message)
    throw createError({ statusCode: 500, message: err.message })
  }
})

// import { defineEventHandler, readMultipartFormData, createError } from 'h3'
// import Groq from 'groq-sdk'
// import mammoth from 'mammoth'
// import { createRequire } from 'module'

// const require = createRequire(import.meta.url)

// const pdf = require('pdf-parse')

// export default defineEventHandler(async (event) => {
//   const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
//   const formData = await readMultipartFormData(event)
//   const file = formData?.find((item) => item.name === 'file' && item.filename)

//   if (!file || !file.data) {
//     throw createError({ 
//       statusCode: 400, 
//       message: "No file provided. Ensure Postman key is 'file' (type: File)." 
//     })
//   }

//   const filename = file.filename?.toLowerCase() || ''
//   let extractedText = ''

//   try {
//     if (filename.endsWith('.pdf')) {
//       console.log('[ping] Parsing PDF...')
//       const data = await pdf(file.data)
//       extractedText = data.text
//     } 
//     else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
//       console.log('[ping] Parsing Word Doc...')
//       const result = await mammoth.extractRawText({ buffer: file.data })
//       extractedText = result.value
//     } 
//     else {
//       console.log('[ping] Parsing as Plain Text...')
//       extractedText = file.data.toString('utf-8')
//     }
//     const cleanText = extractedText
//       .replace(/\s+/g, ' ')
//       .trim()
//       .substring(0, 7000) 
//     if (!cleanText || cleanText.length < 5) {
//       throw new Error("Extracted text is empty. The file might be an image/scan.")
//     }
//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       temperature: 0,
//       messages: [
//         { 
//           role: "system", 
//           content: "You are a professional document analyst. Return ONLY a JSON object with 'title' and 'description'. Use 'Unknown' if you cannot find a title." 
//         },
//         { 
//           role: "user", 
//           content: `Document Content: ${cleanText}` 
//         }
//       ],
//       response_format: { type: "json_object" }
//     })

//     const result = completion.choices[0]?.message?.content
//     return JSON.parse(result || '{}')

//   } catch (err: any) {
//     console.error('[ping] Error:', err.message)
//     throw createError({
//       statusCode: 500,
//       message: `Analysis failed: ${err.message}`
//     })
//   }
// })
// import { createClient } from '@supabase/supabase-js'

// export default defineEventHandler(async (event) => {
//   const config = useRuntimeConfig()

//   const client = createClient(
//     config.public.supabaseUrl,
//     config.supabaseServiceKey
//   )

//   const { data, error } = await client
//     .from('users')
//     .select('user_id, email, full_name, role')

//   if (error) {
//     throw createError({
//       statusCode: 500,
//       statusMessage: `Error: ${error.message}`,
//     })
//   }

//   return {
//     success: true,
//     total_users: data.length,
//     users: data
//   }
// })

