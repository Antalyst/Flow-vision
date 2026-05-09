import mammoth from 'mammoth'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')

export const extractTextFromFile = async (file: { filename: string, data: Buffer }) => {
  const filename = file.filename.toLowerCase()
  let text = ''

  if (filename.endsWith('.pdf')) {
    const data = await pdf(file.data)
    text = data.text
  } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
    const result = await mammoth.extractRawText({ buffer: file.data })
    text = result.value
  } else {
    text = file.data.toString('utf-8')
  }
  return text.replace(/\s+/g, ' ').trim().substring(0, 7000)
}