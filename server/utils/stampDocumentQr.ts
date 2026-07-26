import PizZip from 'pizzip'
import QRCode from 'qrcode'
import ExcelJS from 'exceljs'

const QR_IMAGE_NAME = 'flowvision-qr.png'
/** Display size for the stamped QR (pixels / points depending on format). */
const QR_SIZE_PX = 72

function isDocx(fileName: string, mimeType: string): boolean {
  return (
    fileName.toLowerCase().endsWith('.docx')
    || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

function isXlsx(fileName: string, mimeType: string): boolean {
  return (
    fileName.toLowerCase().endsWith('.xlsx')
    || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

/** True when the upload pipeline must embed a QR image before persisting the blob. */
export function requiresQrStamp(fileName: string, mimeType: string): boolean {
  return isDocx(fileName, mimeType)
}

async function generateQrPngBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: 'png',
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  })
}

function nextRelationshipId(relsXml: string): string {
  let max = 0
  for (const match of relsXml.matchAll(/Id="rId(\d+)"/g)) {
    max = Math.max(max, Number(match[1]))
  }
  return `rId${max + 1}`
}

function ensurePngContentType(contentTypesXml: string): string {
  if (/Extension="png"/i.test(contentTypesXml)) {
    return contentTypesXml
  }
  return contentTypesXml.replace(
    '</Types>',
    '<Default Extension="png" ContentType="image/png"/></Types>',
  )
}

function buildDocxImageParagraph(relId: string, widthPx: number, heightPx: number): string {
  const cx = Math.round(widthPx * 9525)
  const cy = Math.round(heightPx * 9525)
  const docPrId = Math.floor(Math.random() * 1_000_000) + 1

  return `<w:p>
  <w:pPr>
    <w:spacing w:after="120" w:before="0"/>
  </w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${docPrId}" name="FlowVision QR"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="${QR_IMAGE_NAME}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${cx}" cy="${cy}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`
}

function stampDocxBuffer(docxBuffer: Buffer, qrPng: Buffer): Buffer {
  const zip = new PizZip(docxBuffer)

  const documentXmlFile = zip.file('word/document.xml')
  const relsFile = zip.file('word/_rels/document.xml.rels')
  const contentTypesFile = zip.file('[Content_Types].xml')

  if (!documentXmlFile || !relsFile || !contentTypesFile) {
    throw new Error('Invalid DOCX structure: missing core package parts.')
  }

  let relsXml = relsFile.asText()
  const relId = nextRelationshipId(relsXml)

  relsXml = relsXml.replace(
    '</Relationships>',
    `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${QR_IMAGE_NAME}"/></Relationships>`,
  )

  const imageParagraph = buildDocxImageParagraph(relId, QR_SIZE_PX, QR_SIZE_PX)
  let documentXml = documentXmlFile.asText()

  if (!/<w:body[^>]*>/i.test(documentXml)) {
    throw new Error('Invalid DOCX structure: document body not found.')
  }

  documentXml = documentXml.replace(/(<w:body[^>]*>)/i, `$1${imageParagraph}`)

  const contentTypesXml = ensurePngContentType(contentTypesFile.asText())

  zip.file('word/document.xml', documentXml)
  zip.file('word/_rels/document.xml.rels', relsXml)
  zip.file('[Content_Types].xml', contentTypesXml)
  zip.file(`word/media/${QR_IMAGE_NAME}`, qrPng)

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function stampXlsxBuffer(xlsxBuffer: Buffer, qrPng: Buffer): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(xlsxBuffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Invalid XLSX structure: workbook has no sheets.')
  }

  const imageId = workbook.addImage({
    buffer: qrPng,
    extension: 'png',
  })

  sheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: QR_SIZE_PX, height: QR_SIZE_PX },
    editAs: 'oneCell',
  })

  const out = await workbook.xlsx.writeBuffer()
  return Buffer.from(out)
}

/**
 * Embeds a PNG QR code into supported Office formats before MySQL persistence.
 * Returns the original buffer unchanged for unsupported types.
 */
export async function stampDocumentWithQr(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  qrPayload: string,
): Promise<Buffer> {
  const qrPng = await generateQrPngBuffer(qrPayload)

  if (isDocx(fileName, mimeType)) {
    return stampDocxBuffer(buffer, qrPng)
  }

  return buffer
}
