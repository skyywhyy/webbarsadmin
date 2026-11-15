import { request } from '@/shared/api/client'

export type DocumentStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'unavailable'

export type KnowledgeDocument = {
  id: string
  name: string
  description: string
  format: string
  date: number
  file?: Blob
  jobId: string
  sourceId?: string
  documentUrl?: string
  status?: DocumentStatus
}

type CreatedJob = { job_id: string; source_id: string }
type Job = { status: Exclude<DocumentStatus, 'unavailable'> }
type JobListItem = Job & { id: string; source_id: string; title: string; format: string; size_bytes: number | null; created_at: string; document_url: string | null }
type JobPage = { items: JobListItem[]; total: number }

export function uploadDocument(file: File) {
  const body = new FormData()
  body.append('file', file)
  return request<CreatedJob>('/rag/documents', { method: 'POST', body })
}

export function loadJob(jobId: string, signal: AbortSignal) {
  return request<Job>('/rag/jobs/' + encodeURIComponent(jobId), { signal })
}

export function replaceDocument(jobId: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return request<CreatedJob>('/rag/jobs/' + encodeURIComponent(jobId), { method: 'PUT', body })
}

export function removeDocument(jobId: string) {
  return request<void>('/rag/jobs/' + encodeURIComponent(jobId), { method: 'DELETE' })
}

function documentUrl(value: string | null) {
  if (!value) return undefined
  if (/^\/?file-service\//.test(value)) return '/api/' + value.replace(/^\//, '')
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export async function loadDocuments(signal: AbortSignal): Promise<KnowledgeDocument[]> {
  const jobs: JobListItem[] = []
  let page = 1
  let result: JobPage
  do {
    result = await request<JobPage>('/rag/jobs?' + new URLSearchParams({ page: String(page), page_size: '100' }), { signal })
    jobs.push(...result.items)
    page += 1
  } while (result.items.length > 0 && jobs.length < result.total)
  return jobs.map((job) => ({
    id: job.id,
    jobId: job.id,
    sourceId: job.source_id,
    documentUrl: documentUrl(job.document_url),
    name: job.title,
    format: job.format.trim().toUpperCase() || 'Без формата',
    description: [job.format.toUpperCase(), job.size_bytes === null ? '' : formatSize(job.size_bytes)].filter(Boolean).join(' · '),
    date: Number.isFinite(Date.parse(job.created_at)) ? Date.parse(job.created_at) : Date.now(),
    status: job.status,
  }))
}

const fileTypes = new Map([
  ['pdf', 'application/pdf'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['txt', 'text/plain'],
])

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? numberFormat.format(bytes / (1024 * 1024)) + ' МБ'
    : bytes >= 1024 ? numberFormat.format(bytes / 1024) + ' КБ' : bytes + ' Б'
}

export function documentFromFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  const type = file.name.includes('.') ? fileTypes.get(extension) : undefined
  if (!type || !file.size) throw new Error('Выберите непустой файл PDF, DOCX или TXT.')

  const size = formatSize(file.size)

  return {
    name: file.name,
    format: extension.toUpperCase(),
    description: extension.toUpperCase() + ' · ' + size,
    date: Date.now(),
    file: file.slice(0, file.size, type),
  }
}

