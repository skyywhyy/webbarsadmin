export type AnalyticsPeriod = '7d' | '30d' | 'all'
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
  filters: { period: AnalyticsPeriod; format: string; size: DocumentSizeFilter },
  now = Date.now(),
) {
  const start = filters.period === 'all' ? null : now - (filters.period === '7d' ? 7 : 30) * 86_400_000
  return documents.filter((document) => {
    if (start !== null && (document.createdAt === null || document.createdAt < start || document.createdAt > now)) return false
    if (filters.format !== 'all' && document.format !== filters.format) return false
    if (filters.size === 'all') return true
    if (document.sizeBytes === null) return false
    if (filters.size === 'small') return document.sizeBytes < 1_048_576
    if (filters.size === 'medium') return document.sizeBytes >= 1_048_576 && document.sizeBytes <= 5 * 1_048_576
    return document.sizeBytes > 5 * 1_048_576
  })
}

export function summarizeDocuments(documents: AnalyticsDocument[]) {
  return documents.reduce((summary, document) => ({
    count: summary.count + 1,
    knownSizeCount: summary.knownSizeCount + (document.sizeBytes === null ? 0 : 1),
    sizeBytes: summary.sizeBytes + (document.sizeBytes ?? 0),
  }), { count: 0, knownSizeCount: 0, sizeBytes: 0 })
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function formatBytes(bytes: number | null) {
  if (bytes === null) return '—'
  if (bytes >= 1_048_576) return numberFormat.format(bytes / 1_048_576) + ' МБ'
  if (bytes >= 1024) return numberFormat.format(bytes / 1024) + ' КБ'
  return numberFormat.format(bytes) + ' Б'
}
