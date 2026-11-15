import { useEffect, useState } from 'react'
import { loadDocumentAnalytics } from '../model/api'
import { formatBytes } from '../model/analytics'
import type { DocumentAnalyticsData, DocumentPeriod } from '../model/analytics'
import { formatMetric, formatMilliseconds } from '../model/technical-analytics'
import { DocumentFormatChart } from './document-format-chart'
import styles from './home-page.module.css'

type LoadState = { period: DocumentPeriod } & ({ status: 'loading' } | { status: 'error' } | { status: 'ready'; data: DocumentAnalyticsData })

export function DocumentAnalytics({ period }: { period: DocumentPeriod }) {
  const [state, setState] = useState<LoadState>({ period, status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadDocumentAnalytics(period.range, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ period, status: 'ready', data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ period, status: 'error' })
    })
    return () => controller.abort()
  }, [period, attempt])

  const status = state.period === period ? state.status : 'loading'
  const data = state.period === period && state.status === 'ready' ? state.data : null
  const chartPeriod = data?.from_at ? { ...period, fromAt: Date.parse(data.from_at), toAt: Date.parse(data.to_at) } : period
  const sizeBytes = data && data.upload_count > 0 && data.known_size_count === 0 ? null : data?.total_size_bytes ?? null
  const processingMs = data && data.timed_count > 0 ? data.mean_processing_ms : null

  return (
    <section className={styles.documentAnalytics} aria-labelledby="document-analytics-heading">
      <header className={styles.sectionHeader}>
        <div>
          <h2 id="document-analytics-heading">Обработка документов</h2>
          <p className={styles.sectionDescription}>Загрузки, объём файлов и время обработки за выбранный период</p>
        </div>
      </header>
      {status === 'loading' && <p className={styles.analyticsLoading} role="status"><span className={styles.loadingText}>Загружаем статистику документов…</span></p>}
      {status === 'error' && (
        <div className={styles.loadError} role="alert">
          <p>Не удалось загрузить статистику документов. Попробуйте ещё раз.</p>
          <button type="button" onClick={() => { setState({ period, status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button>
        </div>
      )}
      {data && <dl className={`${styles.overview} ${styles.documentOverview}`}>
        <div>
          <dt>Загрузок документов</dt>
          <dd><span className={styles.overviewValue}>{formatMetric(data.upload_count)}</span></dd>
        </div>
        <div>
          <dt>Объём файлов</dt>
          <dd><span className={styles.overviewValue}>{formatBytes(sizeBytes)}</span></dd>
        </div>
        <div>
          <dt>Среднее время обработки</dt>
          <dd>
            <span className={styles.overviewValue}>{formatMilliseconds(processingMs)}{processingMs !== null && <small>с</small>}</span>
          </dd>
        </div>
      </dl>}
      <DocumentFormatChart period={chartPeriod} />
    </section>
  )
}
