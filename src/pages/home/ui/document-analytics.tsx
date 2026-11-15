import { useEffect, useState } from 'react'
import { Select } from '@/shared/ui/select'
import { loadDocumentAnalytics } from '../model/api'
import { documentFormats, documentSizes, formatBytes, formatFirstRecordedAt } from '../model/document-analytics'
import type { DocumentAnalyticsData, DocumentFilters, DocumentFormatFilter, DocumentSizeFilter } from '../model/document-analytics'
import { formatMetric, formatMilliseconds } from '../model/technical-analytics'
import styles from './home-page.module.css'

const ticks = [0, 0.25, 0.5, 0.75, 1]
const formatGroups = [
  { key: 'pdf', label: 'PDF' },
  { key: 'doc_docx', label: 'DOC / DOCX' },
  { key: 'other', label: 'Другие' },
] as const

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: DocumentAnalyticsData }

export function DocumentAnalytics() {
  const [format, setFormat] = useState<DocumentFormatFilter>('all')
  const [size, setSize] = useState<DocumentSizeFilter>('all')

  return (
    <section className={styles.documentAnalytics} aria-labelledby="document-analytics-heading">
      <header className={styles.sectionHeader}>
        <div>
          <h2 id="document-analytics-heading">Обработка документов</h2>
          <p className={styles.sectionDescription}>Загрузки, объём файлов и время обработки</p>
        </div>
        <div className={styles.filters}>
          <Select<DocumentFormatFilter> label="Формат" value={format} onChange={setFormat} options={documentFormats} />
          <Select<DocumentSizeFilter> label="Размер" value={size} onChange={setSize} options={documentSizes} />
        </div>
      </header>
      <DocumentMetrics key={format + ':' + size} format={format} size={size} />
    </section>
  )
}

function DocumentMetrics({ format, size }: DocumentFilters) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadDocumentAnalytics({ format, size }, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'ready', data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [format, size, attempt])

  if (state.status === 'loading') return <p className={styles.analyticsLoading} role="status"><span className={styles.loadingText}>Загружаем статистику документов…</span></p>
  if (state.status === 'error') return (
    <div className={styles.loadError} role="alert">
      <p>Не удалось загрузить статистику документов. Попробуйте ещё раз.</p>
      <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button>
    </div>
  )

  const { data } = state
  const firstRecordedAt = formatFirstRecordedAt(data.first_recorded_at)
  const sizeBytes = data.upload_count > 0 && data.known_size_count === 0 ? null : data.total_size_bytes
  const sizeHint = data.known_size_count < data.upload_count
    ? 'Размер известен для ' + formatMetric(data.known_size_count) + ' из ' + formatMetric(data.upload_count) + ' загрузок'
    : 'Суммарный размер файлов'
  const processingMs = data.timed_count > 0 ? data.mean_processing_ms : null

  return (
    <>
      <dl className={`${styles.overview} ${styles.documentOverview}`}>
        <div>
          <dt>Загрузок документов</dt>
          <dd><span className={styles.overviewValue}>{formatMetric(data.upload_count)}</span><span className={styles.metricHint}>{firstRecordedAt ? 'Данные с ' + firstRecordedAt : 'За всё время'}</span></dd>
        </div>
        <div>
          <dt>Объём файлов</dt>
          <dd><span className={styles.overviewValue}>{formatBytes(sizeBytes)}</span><span className={styles.metricHint}>{sizeHint}</span></dd>
        </div>
        <div>
          <dt>Среднее время обработки</dt>
          <dd>
            <span className={styles.overviewValue}>{formatMilliseconds(processingMs)}{processingMs !== null && <small>с</small>}</span>
            <span className={styles.metricHint}>{processingMs === null ? 'Нет данных о времени обработки' : 'Время известно для ' + formatMetric(data.timed_count) + ' из ' + formatMetric(data.upload_count) + ' загрузок'}</span>
          </dd>
        </div>
      </dl>

      <section className={styles.comparison} aria-labelledby="document-formats-heading">
        <h2 id="document-formats-heading">Загрузки по форматам</h2>
        <p className={styles.sectionDescription}>Доля загрузок с выбранными фильтрами, включая повторные</p>
        {data.upload_count === 0 ? <p className={styles.analyticsLoading}>{format === 'all' && size === 'all' ? 'Документы ещё не загружались' : 'Нет загрузок с выбранными фильтрами'}</p> : (
          <div className={styles.formatChart} role="img" aria-label={formatGroups.map((group) => group.label + ': ' + formatMetric(data.by_format[group.key] / data.upload_count * 100, 1) + ' %, загрузок: ' + formatMetric(data.by_format[group.key])).join('; ')}>
            <div className={styles.formatPlot}>
              {ticks.map((tick) => <div key={tick} className={styles.formatGrid} style={{ bottom: tick * 100 + '%' }}><span>{tick * 100}%</span></div>)}
              <div className={styles.formatColumns}>
                {formatGroups.map((group) => {
                  const count = data.by_format[group.key]
                  const percent = count / data.upload_count * 100
                  return <div key={group.key} className={styles.formatColumn}>
                    <div className={styles.formatBar} style={{ height: percent + '%' }} title={group.label + ': ' + formatMetric(count) + ' из ' + formatMetric(data.upload_count)}>
                      <span className={styles.formatPercent}>{formatMetric(percent, 1)}%</span>
                    </div>
                    <span className={styles.formatName}>{group.label}</span>
                  </div>
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
