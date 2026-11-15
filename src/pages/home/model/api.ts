import { request } from '@/shared/api/client'
import { toAnalyticsDocument } from './analytics'
import type { AnalyticsDocument, DocumentAnalyticsData, DocumentJob } from './analytics'
import type { RequestCost, TechnicalAnalytics, TechnicalRange } from './technical-analytics'

export function loadDocumentAnalytics(signal: AbortSignal) {
  return request<DocumentAnalyticsData>('/analytics/documents', { signal })
}

type DocumentPage = { items: DocumentJob[]; total: number }

export async function loadAnalyticsDocuments(signal: AbortSignal): Promise<AnalyticsDocument[]> {
  const documents: AnalyticsDocument[] = []
  let page = 1
  let result: DocumentPage
  do {
    result = await request<DocumentPage>('/rag/jobs?' + new URLSearchParams({ page: String(page), page_size: '100', include_history: 'true' }), { signal })
    documents.push(...result.items.map(toAnalyticsDocument))
    page += 1
  } while (result.items.length > 0 && documents.length < result.total)
  return documents
}

export function loadTechnicalAnalytics(range: TechnicalRange, signal: AbortSignal) {
  return request<TechnicalAnalytics>('/analytics/requests?' + new URLSearchParams({ range }), { signal })
}

export function loadRequestCost(fromAt: string, toAt: string, signal: AbortSignal) {
  return request<RequestCost>('/analytics/request-cost?' + new URLSearchParams({ from_at: fromAt, to_at: toAt }), { signal })
}
