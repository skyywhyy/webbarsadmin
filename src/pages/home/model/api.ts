import { request } from '@/shared/api/client'
import type { DocumentAnalyticsData, DocumentFilters } from './document-analytics'
import type { RequestCost, TechnicalAnalytics, TechnicalRange } from './technical-analytics'

export function loadDocumentAnalytics(filters: DocumentFilters, signal: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.format !== 'all') params.set('format', filters.format)
  if (filters.size !== 'all') params.set('size', filters.size)
  const query = params.size > 0 ? '?' + params : ''
  return request<DocumentAnalyticsData>('/analytics/documents' + query, { signal })
}

export function loadTechnicalAnalytics(range: TechnicalRange, signal: AbortSignal) {
  return request<TechnicalAnalytics>('/analytics/requests?' + new URLSearchParams({ range }), { signal })
}

export function loadRequestCost(fromAt: string, toAt: string, signal: AbortSignal) {
  return request<RequestCost>('/analytics/request-cost?' + new URLSearchParams({ from_at: fromAt, to_at: toAt }), { signal })
}
