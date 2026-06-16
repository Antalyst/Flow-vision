// server/utils/documentParser.ts
import mammoth from 'mammoth'

export const extractTextFromFile = async (file: { filename: string, data: Buffer }) => {
  const filename = file.filename.toLowerCase()
  let text = ''

  try {
    if (filename.endsWith('.pdf')) {
      text = `PDF document (${file.filename}): server-side text extraction is disabled.`
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer: file.data })
      text = result.value
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      text = `Excel Spreadsheet Document titled: ${file.filename}. Contains structured spreadsheet ledger metrics.`
    } else {
      text = file.data.toString('utf-8')
    }
  } catch (parseError) {
    console.warn(`Parser failed to read text contents for ${filename}, falling back to metadata description.`)
    text = `Document File Name: ${file.filename}`
  }

  return text.replace(/\s+/g, ' ').trim().substring(0, 4000)
}
