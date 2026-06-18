import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

const CANDY_ORANGE = { r: 244, g: 125, b: 47 }
const ONYX = { r: 26, g: 26, b: 26 }

export interface RoutingSheetInput {
  id: string
  title: string
  description?: string
  creatorName?: string
  routeName?: string
  targetOffice?: string
  originOffice?: string
  priority?: string
  createdAt?: string
  qrPayload: string
  qrCanvasDataUrl?: string
  routeSteps?: Array<{ step_number: number; office_name: string }>
}

function formatSheetDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  lines.forEach((line, i) => doc.text(line, x, y + i * lineHeight))
  return y + lines.length * lineHeight
}

export async function generateRoutingSheetPdf(input: RoutingSheetInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentW = pageW - margin * 2

  // ── Branding header banner ───────────────────────────────────────────
  doc.setFillColor(CANDY_ORANGE.r, CANDY_ORANGE.g, CANDY_ORANGE.b)
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('FlowVision', margin, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Official Document Routing Sheet', margin, 22)

  doc.setFontSize(8)
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, 22, { align: 'right' })

  // ── Document identity strip ──────────────────────────────────────────
  let y = 42
  doc.setTextColor(ONYX.r, ONYX.g, ONYX.b)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  y = wrapText(doc, input.title, margin, y, contentW, 7) + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Document ID: ${input.id}`, margin, y)
  y += 10

  // ── Metadata blocks ────────────────────────────────────────────────────
  const blocks: Array<{ label: string; value: string }> = [
    { label: 'Description', value: input.description?.trim() || '—' },
    { label: 'Registered By', value: input.creatorName?.trim() || '—' },
    { label: 'Priority', value: input.priority?.trim() || 'Not specified' },
    { label: 'Registered On', value: formatSheetDate(input.createdAt) },
    { label: 'Route Assignment', value: input.routeName?.trim() || 'Unassigned' },
    { label: 'Target Office', value: input.targetOffice?.trim() || 'Unassigned' },
  ]

  if (input.originOffice) {
    blocks.splice(5, 0, { label: 'Origin Office', value: input.originOffice })
  }

  doc.setDrawColor(230, 230, 230)
  doc.setFillColor(252, 252, 252)

  for (const block of blocks) {
    doc.roundedRect(margin, y, contentW, 18, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(CANDY_ORANGE.r, CANDY_ORANGE.g, CANDY_ORANGE.b)
    doc.text(block.label.toUpperCase(), margin + 4, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(ONYX.r, ONYX.g, ONYX.b)
    const valueLines = doc.splitTextToSize(block.value, contentW - 8) as string[]
    doc.text(valueLines.slice(0, 2), margin + 4, y + 12)
    y += 22
  }

  // ── Route checkpoints ──────────────────────────────────────────────────
  if (input.routeSteps?.length) {
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(ONYX.r, ONYX.g, ONYX.b)
    doc.text('Route Checkpoints', margin, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)

    for (const step of input.routeSteps) {
      doc.text(`Step ${step.step_number}: ${step.office_name}`, margin + 2, y)
      y += 5
      if (y > 230) break
    }
    y += 4
  }

  // ── QR code stamp (prefer live canvas capture from the drawer) ─────────
  const qrDataUrl = input.qrCanvasDataUrl || await QRCode.toDataURL(input.qrPayload, {
    margin: 1,
    width: 400,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
  })

  const qrSize = 42
  const qrX = pageW - margin - qrSize
  const qrY = 255

  doc.setDrawColor(CANDY_ORANGE.r, CANDY_ORANGE.g, CANDY_ORANGE.b)
  doc.setLineWidth(0.6)
  doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 14, 2, 2, 'S')

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(CANDY_ORANGE.r, CANDY_ORANGE.g, CANDY_ORANGE.b)
  doc.text('SCAN TO TRACK', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  const qrLines = doc.splitTextToSize(input.qrPayload, qrSize + 20) as string[]
  doc.text(qrLines.slice(0, 2), qrX + qrSize / 2, qrY + qrSize + 10, { align: 'center' })

  // ── Footer disclaimer ──────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'This routing sheet is system-generated. Attach to the physical hard-copy for field tracking.',
    margin,
    285,
    { maxWidth: contentW - qrSize - 10 },
  )

  const safeId = input.id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12)
  doc.save(`FlowVision-Routing-${safeId || 'document'}.pdf`)
}
