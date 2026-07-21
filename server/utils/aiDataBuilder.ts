// server/utils/aiDataBuilder.ts
//
// AI Data Builder tier (NLQ Architecture V2).
// Sits between the database hydration layer + Gen AI Template Formatter and the
// downstream System / File generator. This is a DETERMINISTIC synthesizer (no LLM
// round-trip): it fuses the raw hydrated rows with the layout blueprint into a single
// explicit dataset that can drive both file exports (Excel/Word) and the interactive
// frontend canvas view.

export type ExportFormat = 'EXCEL' | 'WORD'
export type StructureType = 'TABULAR_GRID' | 'NARRATIVE_REPORT'
export type ColumnType = 'text' | 'longtext' | 'date' | 'number' | 'status'

export interface SynthesizedColumn {
  key: string
  label: string
  type: ColumnType
}

export interface SynthesizedSection {
  sectionId: string
  type: string
  heading: string
  instructions: string
  payload: Record<string, unknown>
}

export interface SynthesizedAggregates {
  totalRecords: number
  statusBreakdown: Record<string, number>
  yearBreakdown: Record<string, number>
  calculated: boolean
  notes: string | null
}

export interface SynthesizedCanvasKpi {
  label: string
  value: number
}

export interface SynthesizedNarrativeBlock {
  heading: string
  meta: string
  body: string
}

export interface SynthesizedDataset {
  format: ExportFormat
  structureType: StructureType
  metadata: {
    title: string
    brandingContext: string
    generationDate: string
    theme: string
    recordCount: number
  }
  columns: SynthesizedColumn[]
  rows: Array<Record<string, unknown>>
  sections: SynthesizedSection[]
  aggregates: SynthesizedAggregates
  canvas: {
    view: 'datagrid' | 'document'
    theme: string
    kpis: SynthesizedCanvasKpi[]
    table: { columns: SynthesizedColumn[]; rows: Array<Record<string, unknown>> }
    narrative: SynthesizedNarrativeBlock[]
  }
  warnings: string[]
}

// Internal / sensitive fields are never projected into columns, exported files, or the
// canvas — this prevents leaking tenant + storage identifiers into client-facing output.
const EXCLUDED_KEYS = new Set([
  'org_id',
  'user_id',
  'mysql_storage_id',
  'qr_code_data',
  'actualFileTextContent',
])

// Stable, human-sensible ordering for known document fields; unknown keys are appended.
const PREFERRED_ORDER = [
  'title',
  'description',
  'status',
  'created_at',
  'uploader_name',
  'office_id',
  'stage_id',
]

const LABEL_OVERRIDES: Record<string, string> = {
  created_at: 'Date Created',
  uploader_name: 'Uploaded By',
  office_id: 'Target Office',
  stage_id: 'Workflow Stage',
}

const LONG_TEXT_KEYS = new Set(['description', 'summary', 'content', 'notes'])

const isFilled = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== ''

const titleCase = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()

const safeString = (value: unknown): string => (isFilled(value) ? String(value) : '—')

const formatDate = (value: unknown): string => {
  if (!isFilled(value)) return '—'
  const parsed = new Date(value as string)
  if (Number.isNaN(parsed.getTime())) return safeString(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

const truncate = (value: unknown, max: number): string => {
  const text = safeString(value)
  if (text === '—') return text
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

const extractYear = (value: unknown): string => {
  if (!isFilled(value)) return 'Unknown'
  const parsed = new Date(value as string)
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : String(parsed.getFullYear())
}

const inferColumnType = (key: string, rows: Array<Record<string, unknown>>): ColumnType => {
  if (key === 'status') return 'status'
  if (/(_at|date)$/i.test(key) || key === 'created_at') return 'date'
  if (LONG_TEXT_KEYS.has(key)) return 'longtext'

  // Numeric inference: every populated sample for this key must be a finite number.
  const samples = rows.map((row) => row?.[key]).filter(isFilled)
  if (samples.length > 0 && samples.every((sample) => Number.isFinite(Number(sample)))) {
    return 'number'
  }
  return 'text'
}

const coerceRows = (databaseResponse: any): Array<Record<string, any>> => {
  if (Array.isArray(databaseResponse)) return databaseResponse
  if (Array.isArray(databaseResponse?.rows)) return databaseResponse.rows
  if (Array.isArray(databaseResponse?.databaseResponse?.rows)) {
    return databaseResponse.databaseResponse.rows
  }
  return []
}

const buildKpis = (aggregates: SynthesizedAggregates): SynthesizedCanvasKpi[] => {
  const kpis: SynthesizedCanvasKpi[] = [
    { label: 'Total Records', value: aggregates.totalRecords },
  ]
  for (const [status, count] of Object.entries(aggregates.statusBreakdown)) {
    kpis.push({ label: status, value: count })
  }
  return kpis
}

const defaultSections = (structureType: StructureType): any[] => {
  if (structureType === 'NARRATIVE_REPORT') {
    return [
      { sectionId: 'header', type: 'title_card', contentInstructions: 'Document header with title and context.' },
      { sectionId: 'summary', type: 'metrics_row', contentInstructions: 'High-level totals and status breakdown.' },
      { sectionId: 'body', type: 'text_block', contentInstructions: 'Narrative breakdown of each matched record.' },
    ]
  }
  return [
    { sectionId: 'header', type: 'title_card', contentInstructions: 'Document header with title and context.' },
    { sectionId: 'metrics', type: 'metrics_row', contentInstructions: 'Aggregate totals across the dataset.' },
    { sectionId: 'grid', type: 'grid', contentInstructions: 'Tabular grid of all matched records.' },
  ]
}

/**
 * Fuse hydrated database rows with the Gen AI layout blueprint into one explicit,
 * export- and canvas-ready dataset. Pure and deterministic — safe to call per request.
 *
 * @param databaseResponse  The hydration payload ({ rows } | { databaseResponse: { rows } } | row[]).
 * @param templateSpecification  The Gen AI Template Formatter blueprint.
 */
export function synthesizeDataTemplate(
  databaseResponse: any,
  templateSpecification: any
): SynthesizedDataset {
  const warnings: string[] = []

  const rawRows = coerceRows(databaseResponse)
  if (rawRows.length === 0) {
    warnings.push('No database rows supplied; produced an empty dataset shell.')
  }

  const spec = templateSpecification && typeof templateSpecification === 'object' ? templateSpecification : {}
  if (!templateSpecification || typeof templateSpecification !== 'object') {
    warnings.push('No template specification supplied; applied deterministic default layout.')
  }

  const format: ExportFormat = spec.targetFileFormat === 'WORD' ? 'WORD' : 'EXCEL'

  const rawStructure = spec.visualLayoutSpecification?.structureType
  const structureType: StructureType =
    rawStructure === 'NARRATIVE_REPORT'
      ? 'NARRATIVE_REPORT'
      : rawStructure === 'TABULAR_GRID'
        ? 'TABULAR_GRID'
        : format === 'WORD'
          ? 'NARRATIVE_REPORT'
          : 'TABULAR_GRID'

  const metadataSpec = spec.documentMetadata ?? {}
  const theme =
    typeof spec.visualLayoutSpecification?.theme === 'string'
      ? spec.visualLayoutSpecification.theme
      : 'Clean corporate layout'

  const metadata = {
    title: isFilled(metadataSpec.title) ? String(metadataSpec.title) : 'FlowVision Generated Report',
    brandingContext: isFilled(metadataSpec.brandingContext)
      ? String(metadataSpec.brandingContext)
      : 'General System',
    generationDate: isFilled(metadataSpec.generationDate)
      ? String(metadataSpec.generationDate)
      : new Date().toISOString().slice(0, 10),
    theme,
    recordCount: rawRows.length,
  }

  // --- Column synthesis (ordered, sanitized) -----------------------------------
  const seen = new Set<string>()
  const orderedKeys: string[] = []

  for (const key of PREFERRED_ORDER) {
    if (EXCLUDED_KEYS.has(key) || seen.has(key)) continue
    if (rawRows.some((row) => row && key in row)) {
      orderedKeys.push(key)
      seen.add(key)
    }
  }
  for (const row of rawRows) {
    for (const key of Object.keys(row ?? {})) {
      if (EXCLUDED_KEYS.has(key) || seen.has(key) || key === 'id') continue
      orderedKeys.push(key)
      seen.add(key)
    }
  }

  const columns: SynthesizedColumn[] = orderedKeys.map((key) => ({
    key,
    label: LABEL_OVERRIDES[key] ?? titleCase(key),
    type: inferColumnType(key, rawRows),
  }))

  // --- Row normalization -------------------------------------------------------
  const concisenessStrategy = String(spec.dataBuilderDirectives?.concisenessStrategy ?? '')
  const maxLongText = /truncat|compact|concise/i.test(concisenessStrategy) ? 160 : 240

  const rows = rawRows.map((row, index) => {
    const cell: Record<string, unknown> = { __ref: isFilled(row?.id) ? row.id : `row-${index}` }
    for (const column of columns) {
      const value = row?.[column.key]
      switch (column.type) {
        case 'date':
          cell[column.key] = formatDate(value)
          break
        case 'longtext':
          cell[column.key] = truncate(value, maxLongText)
          break
        case 'number':
          cell[column.key] = isFilled(value) ? Number(value) : null
          break
        default:
          cell[column.key] = safeString(value)
      }
    }
    return cell
  })

  // --- Aggregates --------------------------------------------------------------
  const statusBreakdown: Record<string, number> = {}
  const yearBreakdown: Record<string, number> = {}
  for (const row of rawRows) {
    const status = isFilled(row?.status) ? String(row.status) : 'Unspecified'
    statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1

    const year = extractYear(row?.created_at)
    yearBreakdown[year] = (yearBreakdown[year] ?? 0) + 1
  }

  const directives = spec.dataBuilderDirectives ?? {}
  const aggregates: SynthesizedAggregates = {
    totalRecords: rawRows.length,
    statusBreakdown,
    yearBreakdown,
    calculated: directives.aggregationRules?.calculateTotals === true,
    notes: isFilled(directives.aggregationRules?.targetCalculations)
      ? String(directives.aggregationRules.targetCalculations)
      : null,
  }

  // --- Section synthesis -------------------------------------------------------
  const specSections = Array.isArray(spec.visualLayoutSpecification?.sections)
    ? spec.visualLayoutSpecification.sections
    : []
  const sectionSource = specSections.length > 0 ? specSections : defaultSections(structureType)

  const narrativeBlocks: SynthesizedNarrativeBlock[] = rawRows.map((row) => ({
    heading: safeString(row?.title),
    meta: formatDate(row?.created_at),
    body: truncate(
      isFilled(row?.description) ? row.description : row?.actualFileTextContent,
      600
    ),
  }))

  const metricsPayload = {
    metrics: buildKpis(aggregates),
    yearBreakdown: aggregates.yearBreakdown,
  }

  const sections: SynthesizedSection[] = sectionSource.map((section: any, index: number) => {
    const type = isFilled(section?.type) ? String(section.type) : 'text_block'
    const sectionId = isFilled(section?.sectionId) ? String(section.sectionId) : `section-${index}`
    const instructions = isFilled(section?.contentInstructions)
      ? String(section.contentInstructions)
      : ''

    let payload: Record<string, unknown> = {}
    switch (type) {
      case 'title_card':
        payload = {
          title: metadata.title,
          subtitle: metadata.brandingContext,
          generationDate: metadata.generationDate,
        }
        break
      case 'metrics_row':
        payload = metricsPayload
        break
      case 'grid':
        payload = { columns, rows }
        break
      case 'text_block':
      default:
        payload = { blocks: narrativeBlocks }
    }

    return {
      sectionId,
      type,
      heading: titleCase(sectionId),
      instructions,
      payload,
    }
  })

  // --- Interactive canvas projection ------------------------------------------
  const canvas: SynthesizedDataset['canvas'] = {
    view: structureType === 'TABULAR_GRID' ? 'datagrid' : 'document',
    theme,
    kpis: buildKpis(aggregates),
    table: { columns, rows },
    narrative: structureType === 'NARRATIVE_REPORT' ? narrativeBlocks : [],
  }

  return {
    format,
    structureType,
    metadata,
    columns,
    rows,
    sections,
    aggregates,
    canvas,
    warnings,
  }
}
