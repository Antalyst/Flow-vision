// server/utils/documentParser.ts
import mammoth from 'mammoth'
// Import the implementation directly, NOT the package root: pdf-parse's own
// index.js has a `!module.parent` "debug mode" check meant to only run when
// the package is executed directly — under Nitro/Vite's CJS-in-ESM interop,
// module.parent is never set, so that check misfires on every import and
// tries to read a nonexistent bundled test fixture (test/data/*.pdf),
// crashing the whole server. This path skips that wrapper entirely.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import ExcelJS from 'exceljs'

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

async function extractXlsxText(data: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(data as any)

  const sheetBlocks: string[] = []
  workbook.eachSheet((sheet) => {
    const lines: string[] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: false }, (cell) => {
        const value = cell.value
        if (value == null) return
        if (value instanceof Date) {
          cells.push(value.toISOString().slice(0, 10))
        } else if (typeof value === 'object') {
          const rich = value as { text?: string; result?: unknown; richText?: { text: string }[] }
          if (typeof rich.text === 'string') cells.push(rich.text)
          else if (Array.isArray(rich.richText)) cells.push(rich.richText.map((r) => r.text).join(''))
          else if (rich.result != null) cells.push(String(rich.result))
        } else {
          cells.push(String(value))
        }
      })
      if (cells.length > 0) lines.push(cells.join(' | '))
    })
    if (lines.length > 0) {
      sheetBlocks.push(`--- Sheet: ${sheet.name} ---\n${lines.join('\n')}`)
    }
  })

  return sheetBlocks.join('\n\n')
}

export interface KnowledgeExtractionResult {
  text: string
  status: 'ready' | 'failed'
  error?: string
}

const KNOWLEDGE_TEXT_CAP = 5_000_000 // ~5MB of text — generous bound against pathological files

/**
 * Full-fidelity text extraction for the org knowledge base (Settings → AI
 * Knowledge Base). Unlike extractTextFromFile above, this is NOT capped to
 * 4000 chars (that cap is tuned for inline record hydration in rag/query.ts)
 * and actually parses .xlsx cell contents instead of returning a placeholder.
 * Only the three formats the knowledge base supports are handled — callers
 * are expected to have already validated the extension.
 */
export async function extractFullTextFromFile(file: { filename: string; data: Buffer }): Promise<KnowledgeExtractionResult> {
  const filename = file.filename.toLowerCase()

  try {
    let text = ''

    if (filename.endsWith('.pdf')) {
      const result = await pdfParse(file.data)
      text = result.text
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: file.data })
      text = result.value
    } else if (filename.endsWith('.xlsx')) {
      text = await extractXlsxText(file.data)
    } else {
      return { text: '', status: 'failed', error: 'Unsupported file type.' }
    }

    const cleaned = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

    if (!cleaned) {
      return { text: '', status: 'failed', error: 'No readable text was found in this file.' }
    }

    return { text: cleaned.slice(0, KNOWLEDGE_TEXT_CAP), status: 'ready' }
  } catch (parseError) {
    console.warn(`[orgKnowledge] Failed to extract text from ${filename}:`, parseError)
    return {
      text: '',
      status: 'failed',
      error: parseError instanceof Error ? parseError.message : 'Failed to parse file.',
    }
  }
}
