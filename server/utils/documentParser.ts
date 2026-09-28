// server/utils/documentParser.ts
import mammoth from 'mammoth'
// Import the implementation directly, NOT the package root: pdf-parse's own
// index.js has a `!module.parent` "debug mode" check meant to only run when
// the package is executed directly — under Nitro/Vite's CJS-in-ESM interop,
// module.parent is never set, so that check misfires on every import and
// tries to read a nonexistent bundled test fixture (test/data/*.pdf),
// crashing the whole server. This path skips that wrapper entirely.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

export const extractTextFromFile = async (file: { filename: string, data: Buffer }) => {
  const filename = file.filename.toLowerCase()
  let text = ''

  try {
    if (filename.endsWith('.pdf')) {
      const result = await pdfParse(file.data)
      text = result.text
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
