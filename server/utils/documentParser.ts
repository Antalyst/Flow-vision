// server/utils/documentParser.ts

/**
 * Extract plain text from a PDF buffer using unpdf (serverless-safe ESM).
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return text ?? ''
}

export const extractTextFromFile = async (file: { filename: string; data: Buffer }) => {
  const filename = file.filename.toLowerCase()
  let text = ''

  try {
    if (filename.endsWith('.pdf')) {
      text = await extractPdfText(file.data)
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const mammoth = await import('mammoth')
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
