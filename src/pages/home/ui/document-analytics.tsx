import { useEffect, useState } from 'react'
import { loadDocumentAnalytics } from '../model/api'
import { formatBytes, formatFirstRecordedAt } from '../model/analytics'
import type { DocumentAnalyticsData } from '../model/analytics'
import { formatMetric, formatMilliseconds } from '../model/technical-analytics'
import { DocumentFormatChart } from './document-format-chart'
import styles from './home-page.module.css'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: DocumentAnalyticsData }

export function DocumentAnalytics() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadDocumentAnalytics(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'ready', data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [attempt])

  const data = state.status === 'ready' ? state.data : null
  const firstRecordedAt = data ? formatFirstRecordedAt(data.first_recorded_at) : null
  const sizeBytes = data && data.upload_count > 0 && data.known_size_count === 0 ? null : data?.total_size_bytes ?? null
  const processingMs = data && data.timed_count > 0 ? data.mean_processing_ms : null

  return (
    <section className={styles.documentAnalytics} aria-labelledby="document-analytics-heading">
      <header className={styles.sectionHeader}>
        <div>
          <h2 id="document-analytics-heading">Обработка документов</h2>
          <p className={styles.sectionDescription}>Загрузки, объём файлов и время обработки</p>
        </div>
      </header>
      {state.status === 'loading' && <p className={styles.analyticsLoading} role="status"><span className={styles.loadingText}>Загружаем статистику документов…</span></p>}
      {state.status === 'error' && (
        <div className={styles.loadError} role="alert">
          <p>Не удалось загрузить статистику документов. Попробуйте ещё раз.</p>
          <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button>
        </div>
      )}
      {data && <dl className={`${styles.overview} ${styles.documentOverview}`}>
        <div>
          <dt>Загрузок документов</dt>
          <dd><span className={styles.overviewValue}>{formatMetric(data.upload_count)}</span><span className={styles.metricHint}>{firstRecordedAt ? 'Данные с ' + firstRecordedAt : 'За всё время'}</span></dd>
        </div>
        <div>
          <dt>Объём файлов</dt>
          <dd><span className={styles.overviewValue}>{formatBytes(sizeBytes)}</span><span className={styles.metricHint}>{data.known_size_count < data.upload_count ? 'Размер известен для ' + formatMetric(data.known_size_count) + ' из ' + formatMetric(data.upload_count) + ' загрузок' : 'Суммарный размер файлов'}</span></dd>
        </div>
        <div>
          <dt>Среднее время обработки</dt>
          <dd>
            <span className={styles.overviewValue}>{formatMilliseconds(processingMs)}{processingMs !== null && <small>с</small>}</span>
            <span className={styles.metricHint}>{processingMs === null ? 'Нет данных о времени обработки' : 'Время известно для ' + formatMetric(data.timed_count) + ' из ' + formatMetric(data.upload_count) + ' загрузок'}</span>
          </dd>
        </div>
      </dl>}
      <DocumentFormatChart />
    </section>
  )
}
