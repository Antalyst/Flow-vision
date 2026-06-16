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
