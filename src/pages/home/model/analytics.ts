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
    document_import: { input: number; output: number; by_model: { model: string; input: number; output: number }[] } | null
  }
}

export type DocumentSizeFilter = 'all' | 'small' | 'medium' | 'large'
export type DocumentStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped'

export type DocumentJob = {
  id: string
  title: string
  format: string
  size_bytes: number | null
  created_at: string
  status: DocumentStatus
}

export type AnalyticsDocument = {
  id: string
  name: string
  format: string
  sizeBytes: number | null
  createdAt: number | null
  status: DocumentStatus
}

export function toAnalyticsDocument(job: DocumentJob): AnalyticsDocument {
  const createdAt = Date.parse(job.created_at)
  return {
    id: job.id,
    name: job.title.trim() || 'Без названия',
    format: job.format.trim().toUpperCase() || 'Без формата',
    sizeBytes: job.size_bytes !== null && Number.isFinite(job.size_bytes) && job.size_bytes >= 0 ? job.size_bytes : null,
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
    status: job.status,
  }
}

export function filterDocuments<T extends AnalyticsDocument>(
  documents: T[],
  filters: { format: string; size: DocumentSizeFilter },
) {
  return documents.filter((document) => {
    if (filters.format !== 'all' && document.format !== filters.format) return false
    if (filters.size === 'all') return true
    if (document.sizeBytes === null) return false
    if (filters.size === 'small') return document.sizeBytes < 1_048_576
    if (filters.size === 'medium') return document.sizeBytes >= 1_048_576 && document.sizeBytes <= 5 * 1_048_576
    return document.sizeBytes > 5 * 1_048_576
  })
}

export function countDocumentFormats(documents: AnalyticsDocument[]) {
  const counts = new Map<string, number>()
  for (const document of documents) {
    counts.set(document.format, (counts.get(document.format) ?? 0) + 1)
  }
  return [...counts].sort(([left], [right]) => left.localeCompare(right, 'ru')).map(([label, count]) => ({ label, count }))
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function formatBytes(bytes: number | null) {
  if (bytes === null) return '—'
  if (bytes >= 1_048_576) return numberFormat.format(bytes / 1_048_576) + ' МБ'
  if (bytes >= 1024) return numberFormat.format(bytes / 1024) + ' КБ'
  return numberFormat.format(bytes) + ' Б'
}

export function formatFirstRecordedAt(value: string | null) {
  const timestamp = value === null ? NaN : Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(timestamp)
    : null
}
