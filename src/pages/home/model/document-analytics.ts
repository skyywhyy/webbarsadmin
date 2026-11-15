export const documentFormats = [
  { value: 'all', label: 'Все форматы' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'html', label: 'HTML' },
  { value: 'md', label: 'MD' },
  { value: 'txt', label: 'TXT' },
] as const

export const documentSizes = [
  { value: 'all', label: 'Любой размер' },
  { value: 'up_to_1_mb', label: 'Меньше 1 МБ' },
  { value: '1_to_5_mb', label: '1–5 МБ' },
  { value: 'over_5_mb', label: 'Больше 5 МБ' },
] as const

export type DocumentFormatFilter = (typeof documentFormats)[number]['value']
export type DocumentSizeFilter = (typeof documentSizes)[number]['value']
export type DocumentFilters = { format: DocumentFormatFilter; size: DocumentSizeFilter }

export type DocumentAnalyticsData = {
  upload_count: number
  total_size_bytes: number
  known_size_count: number
  mean_processing_ms: number | null
  timed_count: number
  first_recorded_at: string | null
  by_format: { pdf: number; doc_docx: number; other: number }
  tokens: {
    from_at: string
    to_at: string
    document_import: {
      input: number
      output: number
      by_model: { model: string; input: number; output: number }[]
    } | null
  }
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatBytes(bytes: number | null) {
  if (bytes === null) return '—'
  if (bytes >= 1_048_576) return numberFormat.format(bytes / 1_048_576) + ' МБ'
  if (bytes >= 1024) return numberFormat.format(bytes / 1024) + ' КБ'
  return numberFormat.format(bytes) + ' Б'
}

export function formatFirstRecordedAt(value: string | null) {
  const timestamp = value === null ? NaN : Date.parse(value)
  return Number.isFinite(timestamp) ? dateFormat.format(timestamp) : null
}
