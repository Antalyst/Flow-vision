// server/utils/documentSynthesizer.ts
//
// Document-oriented synthesis tier. Instead of emitting a flat Excel-style grid,
// this fuses the retrieved SQL rows (and the formatter's layout blueprint) into a
// clean, semantic textual document: executive summary, section headers, and an
// organized layout table. Output conforms to the unified documentPayload shape.
import type { IntentMessage } from './intentRouter'

export interface DocumentPayload {
  title: string
  htmlContent: string
}

// Shared rule set so the synthesizer and the reviser emit consistent markup.
const HTML_BODY_RULES = `
    - Use semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>, <thead>,
      <tbody>, <tr>, <th>, <td>. NEVER include <script>, <style>, inline style attributes,
      event handlers, or <html>/<body> wrappers.
    - Keep it concise, professional, and well-organized.
`

/** Wrapper class the front-end canvas uses to activate spreadsheet/matrix styling. */
export const SPREADSHEET_MATRIX_WRAPPER = 'fv-spreadsheet-matrix'

/** Keyword patterns that signal the user wants an Excel / grid layout. */
const SPREADSHEET_FORMAT_PATTERN =
  /\b(spreadsheet|excel|xlsx|csv|grid|matrix|table\s+layout|raw\s+columns?|tabular|data\s+grid|column\s+view)\b/i

export function wantsSpreadsheetFormat(prompt: string): boolean {
  return SPREADSHEET_FORMAT_PATTERN.test(prompt)
}

/** Exact Tailwind utility classes applied to the full-bleed data matrix. */
const SPREADSHEET_TABLE_SPEC = `
    SPREADSHEET / EXCEL MODE — structural rules:
    - STRIP all narrative elements: NO <h2>, <h3>, <p> executive summaries, NO signature blocks.
    - Output ONLY a wrapper <div class="${SPREADSHEET_MATRIX_WRAPPER}"> containing ONE <table>.
    - Apply these EXACT Tailwind classes:
      • <table class="w-full border-collapse text-sm">
      • <thead> with <tr> containing <th class="border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
      • <tbody> rows: <tr class="odd:bg-white even:bg-slate-50 hover:bg-orange-50/40 transition-colors">
      • <td class="border border-slate-200 px-4 py-2.5 text-slate-700 align-top">
    - Preserve EVERY data cell from the source document; do not drop rows or columns unless asked.
    - Title should reflect spreadsheet context (append " — SPREADSHEET" if helpful).
`

// Columns that must never surface in a user-facing document.
const SENSITIVE_KEYS = new Set([
  'id',
  'org_id',
  'user_id',
  'mysql_storage_id',
  'file_blob',
  'actualFileTextContent',
])

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const prettifyKey = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const shorten = (value: unknown, max = 160): string => {
  const text = value === null || value === undefined || value === '' ? '—' : String(value)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// Defence-in-depth: this HTML is rendered via v-html, so strip script/handlers.
const stripUnsafe = (html: string): string =>
  html
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')

// Deterministic, dependency-free fallback used whenever the LLM is unavailable
// or returns an unusable body — guarantees the data branch always yields a
// well-formed document.
const buildFallbackDocument = (
  userPrompt: string,
  rows: any[],
  blueprint?: any
): DocumentPayload => {
  const rawTitle =
    blueprint?.documentMetadata?.title || `Report — ${userPrompt}` || 'Document Report'
  const title = String(rawTitle).toUpperCase().slice(0, 120)

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      title,
      htmlContent:
        '<h2>Executive Summary</h2><p>No records matched this request for your organization.</p>',
    }
  }

  const keys = Object.keys(rows[0]).filter((k) => !SENSITIVE_KEYS.has(k))
  const headCells = keys.map((k) => `<th>${escapeHtml(prettifyKey(k))}</th>`).join('')
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${keys.map((k) => `<td>${escapeHtml(shorten(row[k]))}</td>`).join('')}</tr>`
    )
    .join('')

  const htmlContent = `
    <h2>Executive Summary</h2>
    <p>This report compiles <strong>${rows.length}</strong> record(s) retrieved from your
    organization's documents in response to: &ldquo;${escapeHtml(userPrompt)}&rdquo;.</p>
    <h3>Record Detail</h3>
    <table>
      <thead><tr>${headCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `

  return { title, htmlContent }
}

const stripHtmlTags = (fragment: string): string =>
  fragment.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

/** Pull tabular data out of an existing narrative or matrix document. */
const extractTableDataFromHtml = (
  html: string
): { headers: string[]; rows: string[][] } => {
  const headers: string[] = []
  const rows: string[][] = []

  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
  if (theadMatch) {
    for (const m of theadMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)) {
      headers.push(stripHtmlTags(m[1]))
    }
  }

  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
  if (tbodyMatch) {
    for (const tr of tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
        stripHtmlTags(m[1])
      )
      if (cells.length) rows.push(cells)
    }
  }

  if (!headers.length && rows.length) {
    return {
      headers: rows[0].map((_, i) => `Column ${i + 1}`),
      rows: rows.slice(1).length ? rows.slice(1) : rows,
    }
  }

  return { headers, rows }
}

/** Deterministic full-bleed spreadsheet matrix (Tailwind-class markup). */
const buildSpreadsheetMatrixHtml = (headers: string[], rows: string[][]): string => {
  const thCells = headers
    .map(
      (h) =>
        `<th class="border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">${escapeHtml(
          h
        )}</th>`
    )
    .join('')

  const bodyRows = rows
    .map((row) => {
      const tds = row
        .map(
          (cell) =>
            `<td class="border border-slate-200 px-4 py-2.5 text-slate-700 align-top">${escapeHtml(
              cell
            )}</td>`
        )
        .join('')
      return `<tr class="odd:bg-white even:bg-slate-50 hover:bg-orange-50/40 transition-colors">${tds}</tr>`
    })
    .join('')

  return `<div class="${SPREADSHEET_MATRIX_WRAPPER}"><table class="w-full border-collapse text-sm"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
}

const buildSpreadsheetFallback = (existing: DocumentPayload): DocumentPayload => {
  const { headers, rows } = extractTableDataFromHtml(existing.htmlContent)
  if (!headers.length && !rows.length) {
    return existing
  }

  const title = existing.title.toUpperCase().includes('SPREADSHEET')
    ? existing.title
    : `${existing.title} — SPREADSHEET`.toUpperCase().slice(0, 120)

  return {
    title,
    htmlContent: buildSpreadsheetMatrixHtml(headers, rows),
  }
}

/** Re-structure an existing narrative document into a full-bleed spreadsheet matrix. */
async function reviseToSpreadsheetMatrix(
  existing: DocumentPayload,
  critique: string,
  history: IntentMessage[] = []
): Promise<DocumentPayload> {
  if (!existing?.htmlContent) {
    return existing
  }

  const systemInstruction = `
    You are the FlowVision Spreadsheet Matrix Converter. The user wants to SWITCH the
    existing document from a narrative report layout into a pure administrative DATA GRID.

    Respond with ONLY a raw JSON object (no markdown fences):
    {
      "title": "A CLEAN, DESCRIPTIVE, UPPERCASE TITLE (include SPREADSHEET if appropriate)",
      "htmlContent": "full-bleed matrix HTML"
    }

    ${SPREADSHEET_TABLE_SPEC}
  `

  try {
    const completion = await useGroq().chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        {
          role: 'user',
          content:
            `Existing document title: "${existing.title}"\n\n` +
            `Existing document htmlContent:\n${existing.htmlContent}\n\n` +
            `Format-switch request: "${critique}"`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const title = String(parsed?.title || `${existing.title} — SPREADSHEET`)
      .toUpperCase()
      .slice(0, 120)
    let htmlContent = stripUnsafe(String(parsed?.htmlContent || '')).trim()

    if (!htmlContent.includes(SPREADSHEET_MATRIX_WRAPPER)) {
      htmlContent = `<div class="${SPREADSHEET_MATRIX_WRAPPER}">${htmlContent}</div>`
    }

    if (!htmlContent.includes('<table')) {
      return buildSpreadsheetFallback(existing)
    }

    return { title, htmlContent }
  } catch (error) {
    console.error('[documentSynthesizer] spreadsheet conversion failed, using fallback:', error)
    return buildSpreadsheetFallback(existing)
  }
}

/**
 * Synthesize a structured textual document (title + semantic HTML body) from the
 * retrieved rows. Falls back to a deterministic builder on any failure.
 */
export async function synthesizeDocumentPayload(
  userPrompt: string,
  rows: any[],
  blueprint?: any
): Promise<DocumentPayload> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return buildFallbackDocument(userPrompt, rows, blueprint)
  }

  // First-pass spreadsheet request — skip narrative, emit matrix immediately.
  if (wantsSpreadsheetFormat(userPrompt)) {
    const keys = Object.keys(rows[0]).filter((k) => !SENSITIVE_KEYS.has(k))
    const headers = keys.map(prettifyKey)
    const tableRows = rows.map((row) => keys.map((k) => shorten(row[k])))
    const rawTitle =
      blueprint?.documentMetadata?.title || `Report — ${userPrompt}` || 'Document Report'
    const title = `${String(rawTitle)} — SPREADSHEET`.toUpperCase().slice(0, 120)
    return { title, htmlContent: buildSpreadsheetMatrixHtml(headers, tableRows) }
  }

  const systemInstruction = `
    You are the FlowVision Document Synthesizer. You transform raw database rows into a
    clean, formal, executive-ready DOCUMENT — never a bare spreadsheet dump.

    Respond with ONLY a raw JSON object (no markdown fences) in this EXACT shape:
    {
      "title": "A CLEAN, DESCRIPTIVE, UPPERCASE TITLE",
      "htmlContent": "semantic HTML body"
    }

    Rules for "htmlContent":
    - Use semantic HTML only: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <table>, <thead>,
      <tbody>, <tr>, <th>, <td>. NEVER include <script>, <style>, inline style attributes,
      event handlers, or <html>/<body> wrappers.
    - Begin with an "<h2>Executive Summary</h2>" and a concise paragraph describing what the
      data shows (counts, notable statuses, time range).
    - Add logical sections with headers, and present the records in a well-organized <table>
      with clear column headers.
    - Be faithful to the data — do not invent records, counts, IDs, or statuses that are not
      present in the provided rows.
    - Keep it concise and professional.
  `

  const safeRows = rows.map((row) => {
    const clone: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (!SENSITIVE_KEYS.has(key)) clone[key] = value
    }
    return clone
  })

  try {
    const completion = await useGroq().chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content:
            `User Request: "${userPrompt}"\n\n` +
            `Layout Blueprint: ${JSON.stringify(blueprint ?? {}, null, 2)}\n\n` +
            `Database Rows: ${JSON.stringify(safeRows, null, 2)}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const title = String(parsed?.title || 'DOCUMENT REPORT').toUpperCase().slice(0, 120)
    const htmlContent = stripUnsafe(String(parsed?.htmlContent || '')).trim()

    if (!htmlContent) {
      return buildFallbackDocument(userPrompt, rows, blueprint)
    }

    return { title, htmlContent }
  } catch (error) {
    console.error('[documentSynthesizer] synthesis failed, using fallback:', error)
    return buildFallbackDocument(userPrompt, rows, blueprint)
  }
}

/**
 * Iterative re-synthesis. Injects the EXISTING document payload alongside the
 * user's formatting critique so the model returns an updated documentPayload
 * reflecting those layout adjustments — without re-querying the database. The
 * underlying record data must be preserved unless the critique explicitly asks
 * to add or remove columns/sections. On any failure the existing payload is
 * returned unchanged.
 */
export async function reviseDocumentPayload(
  existing: DocumentPayload,
  critique: string,
  history: IntentMessage[] = []
): Promise<DocumentPayload> {
  if (!existing?.htmlContent) {
    return existing
  }

  // Multi-format detection: spreadsheet / excel / grid keywords → matrix mode.
  if (wantsSpreadsheetFormat(critique)) {
    return reviseToSpreadsheetMatrix(existing, critique, history)
  }

  const systemInstruction = `
    You are the FlowVision Document Reviser. You are given an EXISTING document (title +
    semantic HTML body) and a user's formatting/layout critique. Apply ONLY the requested
    layout/formatting changes and return the full, updated document.

    Respond with ONLY a raw JSON object (no markdown fences) in this EXACT shape:
    {
      "title": "A CLEAN, DESCRIPTIVE, UPPERCASE TITLE",
      "htmlContent": "the FULL updated semantic HTML body"
    }

    Revision rules:
    - PRESERVE all existing record data and facts. Do not invent, drop, or alter values
      unless the critique explicitly asks to add/remove a column, row, or section.
    - Apply the critique faithfully (e.g. tone/formality, add a signature block, remove a
      column, restructure into sections, rename the title, shorten).
    - Return the ENTIRE document, not just the changed fragment.
    ${HTML_BODY_RULES}
  `

  try {
    const completion = await useGroq().chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        {
          role: 'user',
          content:
            `Existing document title: "${existing.title}"\n\n` +
            `Existing document htmlContent:\n${existing.htmlContent}\n\n` +
            `Formatting critique to apply: "${critique}"`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const title = String(parsed?.title || existing.title || 'DOCUMENT REPORT')
      .toUpperCase()
      .slice(0, 120)
    const htmlContent = stripUnsafe(String(parsed?.htmlContent || '')).trim()

    if (!htmlContent) {
      return existing
    }

    return { title, htmlContent }
  } catch (error) {
    console.error('[documentSynthesizer] revision failed, keeping existing payload:', error)
    return existing
  }
}
