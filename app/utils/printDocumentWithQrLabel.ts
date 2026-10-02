import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'

/**
 * Standalone print for a just-uploaded document: the document's own pages print
 * first, then one extra page with the QR Tracking Label (same content as
 * DocumentQrStickerModal). Must be called AFTER the upload succeeds, with the
 * server-saved `qr_code_data` — that is the QR messengers scan for pickup, so
 * the paper and the system always match.
 *
 * Prints through a hidden iframe rather than window.open, because this runs
 * after an awaited upload and popup blockers only allow window.open on a click.
 */

/** Label QR sizes offered by the upload modal, mapped to the inches the picker shows. */
export type QrLabelSize = 50 | 120 | 200
const QR_SIZE_INCHES: Record<QrLabelSize, number> = { 50: 1, 120: 2, 200: 4 }

const ORANGE = rgb(244 / 255, 125 / 255, 47 / 255)
const INK = rgb(26 / 255, 26 / 255, 26 / 255)
const MUTED = rgb(110 / 255, 110 / 255, 110 / 255)
const SCAN_HINT = 'Scan with the FlowVision messenger app to claim pickup.'

export interface QrLabelOptions {
  qrPayload: string
  title: string
  qrSize: QrLabelSize
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// pdf-lib's standard fonts only encode WinAnsi — drop anything else (emoji, CJK)
// rather than letting drawText throw and abort the whole print.
function toWinAnsi(value: string) {
  return value.replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

/** Word-wraps `text` to at most `maxLines`, ending with "…" when it had to cut. */
function wrapWords(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  let i = 0
  for (; i < words.length; i++) {
    const candidate = line ? `${line} ${words[i]}` : words[i]!
    if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
      continue
    }
    lines.push(line)
    line = words[i]!
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (i < words.length) lines[lines.length - 1] += '…'
  return lines
}

/** Breaks a space-free string (the QR payload) into fixed-width monospace lines. */
function chunkMono(text: string, font: PDFFont, size: number, maxWidth: number) {
  const perLine = Math.max(1, Math.floor(maxWidth / font.widthOfTextAtSize('M', size)))
  const lines: string[] = []
  for (let i = 0; i < text.length; i += perLine) lines.push(text.slice(i, i + perLine))
  return lines
}

async function appendLabelPage(pdf: PDFDocument, qrDataUrl: string, opts: QrLabelOptions) {
  const firstPage = pdf.getPages()[0]
  const [pageW, pageH] = firstPage ? [firstPage.getWidth(), firstPage.getHeight()] : [595.28, 841.89]
  const page = pdf.addPage([pageW, pageH])

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const mono = await pdf.embedFont(StandardFonts.Courier)
  const qrImage = await pdf.embedPng(qrDataUrl)

  const qrPt = QR_SIZE_INCHES[opts.qrSize] * 72
  const boxW = Math.min(pageW - 72, Math.max(qrPt + 80, 320))
  const textW = boxW - 40
  const titleLines = wrapWords(toWinAnsi(opts.title) || 'Document', bold, 14, textW, 2)
  const payloadLines = chunkMono(toWinAnsi(opts.qrPayload), mono, 8, textW)

  // Block layout, top to bottom (heights in points).
  const heights = {
    kicker: 12,
    gap1: 10,
    title: titleLines.length * 18,
    gap2: 16,
    qr: qrPt,
    gap3: 12,
    payload: payloadLines.length * 11,
    gap4: 10,
    hint: 12,
  }
  const contentH = Object.values(heights).reduce((a, b) => a + b, 0)
  const boxH = contentH + 48
  const boxX = (pageW - boxW) / 2
  const boxY = (pageH - boxH) / 2

  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1 })

  const centerX = (text: string, font: PDFFont, size: number) => (pageW - font.widthOfTextAtSize(text, size)) / 2
  let y = boxY + boxH - 24

  y -= heights.kicker
  const kicker = 'QR TRACKING LABEL'
  page.drawText(kicker, { x: centerX(kicker, bold, 10), y, size: 10, font: bold, color: ORANGE })
  y -= heights.gap1

  for (const line of titleLines) {
    y -= 18
    page.drawText(line, { x: centerX(line, bold, 14), y: y + 4, size: 14, font: bold, color: INK })
  }
  y -= heights.gap2

  y -= qrPt
  page.drawImage(qrImage, { x: (pageW - qrPt) / 2, y, width: qrPt, height: qrPt })
  y -= heights.gap3

  for (const line of payloadLines) {
    y -= 11
    page.drawText(line, { x: centerX(line, mono, 8), y: y + 2, size: 8, font: mono, color: MUTED })
  }
  y -= heights.gap4

  y -= heights.hint
  page.drawText(SCAN_HINT, { x: centerX(SCAN_HINT, regular, 9), y, size: 9, font: regular, color: MUTED })
}

function labelPageHtml(qrDataUrl: string, opts: QrLabelOptions, { newPage = true } = {}) {
  const inches = QR_SIZE_INCHES[opts.qrSize]
  return `
<section class="fv-label-page${newPage ? ' fv-new-page' : ''}">
  <div class="fv-label">
    <p class="fv-kicker">QR Tracking Label</p>
    <p class="fv-title">${escapeHtml(opts.title || 'Document')}</p>
    <img src="${qrDataUrl}" alt="Tracking QR" style="width:${inches}in;height:${inches}in" />
    <p class="fv-hint">${SCAN_HINT}</p>
  </div>
</section>`
}

const LABEL_CSS = `
.fv-new-page{page-break-before:always;break-before:page}
.fv-label-page{display:flex;align-items:center;justify-content:center;min-height:95vh;background:#fff}
.fv-label{border:1px solid #d9d9d9;border-radius:12px;padding:24px 28px;text-align:center;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:6.5in}
.fv-kicker{margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f47d2f}
.fv-title{margin:0 0 16px;font-size:16px;font-weight:700;word-break:break-word}
.fv-label img{display:block;margin:0 auto;image-rendering:pixelated}
.fv-payload{margin:12px 0 0;font-family:'Courier New',monospace;font-size:10px;color:#6e6e6e;word-break:break-all}
.fv-hint{margin:8px 0 0;font-size:11px;color:#6e6e6e}
`

function printInHiddenFrame(setup: (iframe: HTMLIFrameElement) => void, onFail?: () => void) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    iframe.remove()
  }
  iframe.onload = () => {
    try {
      const win = iframe.contentWindow
      if (!win) throw new Error('Print frame unavailable')
      win.addEventListener('afterprint', () => setTimeout(cleanup, 1000))
      win.focus()
      win.print()
    } catch (err) {
      console.error('[printDocumentWithQrLabel] print failed:', err)
      cleanup()
      onFail?.()
    }
  }
  setup(iframe)
  document.body.appendChild(iframe)
  // Safety net in case `afterprint` never fires (e.g. PDF viewer frames).
  setTimeout(cleanup, 5 * 60 * 1000)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function printHtml(bodyHtml: string, extraCss = '') {
  printInHiddenFrame((iframe) => {
    iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:12mm}body{margin:0;background:#fff}${extraCss}${LABEL_CSS}</style></head><body>${bodyHtml}</body></html>`
  })
}

async function printPdfWithLabel(buf: ArrayBuffer, fileName: string, qrDataUrl: string, opts: QrLabelOptions) {
  const pdf = await PDFDocument.load(buf)
  await appendLabelPage(pdf, qrDataUrl, opts)
  const blob = new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' })
  const outName = fileName.replace(/\.pdf$/i, '') + '-with-qr-label.pdf'

  // Browsers without an inline PDF viewer (most mobile browsers) can't print a
  // PDF from an iframe — hand them the combined file instead.
  if (navigator.pdfViewerEnabled === false) {
    downloadBlob(blob, outName)
    return
  }
  const url = URL.createObjectURL(blob)
  printInHiddenFrame(
    (iframe) => { iframe.src = url },
    () => downloadBlob(blob, outName),
  )
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
}

async function docxToHtml(buf: ArrayBuffer) {
  const { renderAsync } = await import('docx-preview')
  const div = document.createElement('div')
  await renderAsync(buf, div)
  return div.innerHTML
}

async function spreadsheetToHtml(buf: ArrayBuffer) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buf, { type: 'array' })
  return workbook.SheetNames
    .map((name, i) => {
      const sheet = workbook.Sheets[name]
      if (!sheet) return ''
      const table = XLSX.utils.sheet_to_html(sheet, { header: '', footer: '' })
      return `<section class="fv-sheet"${i > 0 ? ' style="page-break-before:always;break-before:page"' : ''}><h3>${escapeHtml(name)}</h3>${table}</section>`
    })
    .join('')
}

const DOCX_CSS = '.docx-wrapper{background:#fff!important;padding:0!important}.docx{box-shadow:none!important;margin:0!important;width:100%!important}'
const SHEET_CSS = '.fv-sheet h3{font-family:Helvetica,Arial,sans-serif;font-size:13px;margin:0 0 8px}.fv-sheet table{border-collapse:collapse;width:100%;font-family:Helvetica,Arial,sans-serif;font-size:10px}.fv-sheet td,.fv-sheet th{border:1px solid #ccc;padding:3px 6px}'

/**
 * Prints `file` followed by its QR Tracking Label page in one print job.
 * Formats the browser can't render (e.g. legacy .doc) print the label page only;
 * the return value says which happened so the caller can tell the user.
 */
export async function printDocumentWithQrLabel(
  file: File,
  opts: QrLabelOptions,
): Promise<{ printedDocument: boolean }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const qrDataUrl = await QRCode.toDataURL(opts.qrPayload, { margin: 1, width: 600, errorCorrectionLevel: 'M' })
  const buf = await file.arrayBuffer()

  if (ext === 'pdf') {
    await printPdfWithLabel(buf, file.name, qrDataUrl, opts)
    return { printedDocument: true }
  }

  if (ext === 'docx') {
    printHtml((await docxToHtml(buf)) + labelPageHtml(qrDataUrl, opts), DOCX_CSS)
    return { printedDocument: true }
  }

  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
    printHtml((await spreadsheetToHtml(buf)) + labelPageHtml(qrDataUrl, opts), SHEET_CSS)
    return { printedDocument: true }
  }

  // No in-browser renderer for this format — print the label on its own.
  printHtml(labelPageHtml(qrDataUrl, opts, { newPage: false }))
  return { printedDocument: false }
}
