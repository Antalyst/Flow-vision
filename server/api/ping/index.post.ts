import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { extractTextFromFile } from '~~/server/utils/documentParser'
import { analyzeDocument } from '~~/server/utils/aiAnalyzer'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find((item) => item.name === 'file' && item.filename)

  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'No file provided.' })
  }

  try {
    const text = await extractTextFromFile({
      filename: file.filename || '',
      data: file.data,
    })

    if (text.length < 5) {
      throw new Error('Document content is too short or unreadable.')
    }

    return await analyzeDocument(text)
  } catch (err: any) {
    console.error('[ping] Error:', err.message)
    throw createError({ statusCode: 500, message: err.message })
  }
})
