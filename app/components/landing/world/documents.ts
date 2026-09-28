import { CanvasTexture, SRGBColorSpace } from 'three'

// Procedural document atlas: four recognisable paper types drawn once to a 2×2 canvas.
// No image files to ship; resolution scales with the device tier.

const PAPER = '#F2EFE8'
const EDGE = '#DCD7CC'
const INK = '#2E2D2A'
const MUTED = '#8B8781'
const LINE = '#CFCAC0'
const LINE_SOFT = '#E0DBD1'
const TABLE = '#E6E1D6'
const SIGNAL = '#FF6A2A'

const W = 256
const H = 362
const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif'

export const DOCUMENT_VARIANTS = ['invoice', 'permit', 'memo', 'report'] as const
export const INVOICE_VARIANT = 0

type Ctx = CanvasRenderingContext2D

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, r = h / 2) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function text(ctx: Ctx, value: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = 'left', spacing = 0) {
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${spacing}px`
  ctx.fillText(value, x, y)
}

function paragraph(ctx: Ctx, x: number, y: number, widths: number[], gap = 13) {
  widths.forEach((w, i) => bar(ctx, x, y + i * gap, w, 5, i % 4 === 3 ? LINE_SOFT : LINE))
}

function qr(ctx: Ctx, x: number, y: number, size: number, seed: number) {
  const n = 21
  const cell = size / n
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  ctx.fillStyle = INK
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
      if (!inFinder && rand() > 0.52) ctx.fillRect(x + c * cell, y + r * cell, cell + 0.2, cell + 0.2)
    }
  }
  const finder = (fx: number, fy: number) => {
    ctx.fillRect(fx, fy, cell * 7, cell * 7)
    ctx.fillStyle = PAPER
    ctx.fillRect(fx + cell, fy + cell, cell * 5, cell * 5)
    ctx.fillStyle = INK
    ctx.fillRect(fx + cell * 2, fy + cell * 2, cell * 3, cell * 3)
  }
  finder(x, y)
  finder(x + cell * (n - 7), y)
  finder(x, y + cell * (n - 7))
}

function drawInvoice(ctx: Ctx) {
  bar(ctx, 22, 24, 18, 18, SIGNAL, 4)
  bar(ctx, 46, 29, 58, 6, LINE)
  paragraph(ctx, 160, 24, [74, 60, 68], 11)
  text(ctx, 'INVOICE', 22, 78, 24, 700, INK, 'left', 1)
  text(ctx, 'No. FV-2041', 22, 96, 11, 500, MUTED)
  bar(ctx, 22, 116, 212, 16, TABLE, 3)
  const rows = [118, 96, 132, 88, 110]
  rows.forEach((w, i) => {
    const y = 146 + i * 22
    bar(ctx, 22, y, w, 5, LINE)
    bar(ctx, 196, y, 38, 5, LINE)
  })
  ctx.fillStyle = LINE_SOFT
  ctx.fillRect(22, 262, 212, 1)
  text(ctx, 'TOTAL', 22, 290, 12, 700, INK, 'left', 1)
  bar(ctx, 164, 279, 70, 14, SIGNAL, 3)
  qr(ctx, 22, 304, 40, 7)
  paragraph(ctx, 74, 312, [96, 72], 11)
}

function drawPermit(ctx: Ctx) {
  text(ctx, 'BUILDING PERMIT', 128, 60, 16, 700, INK, 'center', 1.5)
  ctx.fillStyle = LINE_SOFT
  ctx.fillRect(64, 72, 128, 1)
  text(ctx, 'Municipal Office · Ref 7731', 128, 90, 10, 500, MUTED, 'center')
  paragraph(ctx, 22, 112, [212, 198, 208, 176, 212, 190, 150, 204, 120])
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(30, 312)
  ctx.bezierCurveTo(44, 290, 54, 322, 68, 304)
  ctx.bezierCurveTo(78, 292, 86, 318, 104, 306)
  ctx.stroke()
  bar(ctx, 28, 322, 84, 1.5, LINE)
  ctx.strokeStyle = SIGNAL
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(196, 300, 26, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(196, 300, 20, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(185, 300)
  ctx.lineTo(193, 308)
  ctx.lineTo(208, 291)
  ctx.stroke()
}

function drawMemo(ctx: Ctx) {
  text(ctx, 'MEMO', 22, 62, 26, 700, INK, 'left', 2)
  bar(ctx, 22, 72, 36, 4, SIGNAL, 2)
  const fields = ['TO', 'FROM', 'DATE']
  fields.forEach((label, i) => {
    const y = 104 + i * 20
    text(ctx, label, 22, y, 10, 700, MUTED, 'left', 1)
    bar(ctx, 64, y - 6, [120, 96, 70][i]!, 5, LINE)
  })
  ctx.fillStyle = LINE_SOFT
  ctx.fillRect(22, 158, 212, 1)
  paragraph(ctx, 22, 176, [212, 204, 190, 212, 168, 208, 140, 196, 98])
  ctx.strokeStyle = SIGNAL
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(170, 36, 64, 20, 10)
  ctx.stroke()
  text(ctx, 'URGENT', 202, 50, 9, 700, SIGNAL, 'center', 1)
}

function drawReport(ctx: Ctx) {
  text(ctx, 'QUARTERLY', 22, 50, 11, 700, MUTED, 'left', 2)
  text(ctx, 'REPORT', 22, 78, 24, 700, INK, 'left', 1)
  paragraph(ctx, 22, 98, [188, 150], 12)
  const base = 250
  const bars = [0.45, 0.62, 0.52, 0.8, 0.68]
  bars.forEach((h, i) => {
    const x = 34 + i * 40
    const height = h * 110
    bar(ctx, x, base - height, 24, height, i === 3 ? SIGNAL : TABLE, 3)
  })
  ctx.fillStyle = LINE
  ctx.fillRect(22, base + 2, 212, 1)
  paragraph(ctx, 22, 272, [212, 196, 206, 132])
}

const DRAWERS: Record<(typeof DOCUMENT_VARIANTS)[number], (ctx: Ctx) => void> = {
  invoice: drawInvoice,
  permit: drawPermit,
  memo: drawMemo,
  report: drawReport,
}

export function createDocumentAtlas(scale: number) {
  const cw = Math.round(W * scale)
  const ch = Math.round(H * scale)
  const canvas = document.createElement('canvas')
  canvas.width = cw * 2
  canvas.height = ch * 2
  const ctx = canvas.getContext('2d')!

  DOCUMENT_VARIANTS.forEach((variant, i) => {
    ctx.save()
    ctx.translate((i % 2) * cw, Math.floor(i / 2) * ch)
    ctx.scale(cw / W, ch / H)
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = EDGE
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
    DRAWERS[variant](ctx)
    ctx.restore()
  })

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Width:height of a document plane (A-series paper). */
export const DOCUMENT_ASPECT = W / H
