import { useEffect, useState } from 'react'
import { Select } from '@/shared/ui/select'
import { loadAnalyticsDocuments } from '../model/api'
import { createDemoDocuments } from '../model/demo-documents'
import { filterDocuments, formatBytes, summarizeDocuments } from '../model/analytics'
import type { AnalyticsDocument, AnalyticsPeriod, DocumentSizeFilter } from '../model/analytics'
import styles from './home-page.module.css'

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const ticks = [0, 0.25, 0.5, 0.75, 1]
const formatGroups = [
  { label: 'PDF', formats: ['PDF'] },
  { label: 'DOC / DOCX', formats: ['DOC', 'DOCX'] },
  { label: 'XLS / XLSX', formats: ['XLS', 'XLSX'] },
  { label: 'Изображения', formats: ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG', 'BMP', 'TIFF', 'TIF', 'HEIC', 'AVIF'] },
  { label: 'Другие', formats: [] },
]
const sizeOptions = [
  { value: 'all', label: 'Любой размер' },
  { value: 'small', label: 'До 1 МБ' },
  { value: 'medium', label: '1–5 МБ' },
  { value: 'large', label: 'Больше 5 МБ' },
] as const
type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; documents: AnalyticsDocument[] }

export function DocumentAnalytics({ period }: { period: AnalyticsPeriod }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [demoDocuments] = useState(() => createDemoDocuments())
  const [format, setFormat] = useState('all')
  const [size, setSize] = useState<DocumentSizeFilter>('all')

  useEffect(() => {
    const controller = new AbortController()
    loadAnalyticsDocuments(controller.signal).then((documents) => {
      if (!controller.signal.aborted) setState({ status: 'ready', documents })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [attempt])

  const documents = state.status === 'ready' ? state.documents : []
  const formats = [...new Set([...documents, ...demoDocuments].map((document) => document.format))].sort()
  const filters = { period, format, size }
  const filteredDocuments = filterDocuments(documents, filters)
  const summary = summarizeDocuments(filteredDocuments)
  const formatCounts = formatGroups.map(() => 0)
  for (const document of filteredDocuments) {
    const group = formatGroups.findIndex((item) => item.formats.includes(document.format))
    formatCounts[group === -1 ? formatGroups.length - 1 : group] += 1
  }
  const sizeBytes = summary.count > 0 && summary.knownSizeCount === 0 ? null : summary.sizeBytes
  const sizeHint = summary.knownSizeCount < summary.count
    ? 'Размер известен для ' + summary.knownSizeCount + ' из ' + summary.count + ' загрузок'
    : 'Суммарный размер файлов в выборке'
  const completedDemo = filterDocuments(demoDocuments, filters).filter((document) => document.status === 'succeeded' && document.processingSeconds !== null)
  const demoAverage = completedDemo.length ? completedDemo.reduce((sum, document) => sum + (document.processingSeconds ?? 0), 0) / completedDemo.length : null

  return (
    <section className={styles.documentAnalytics} aria-labelledby="document-analytics-heading" aria-busy={state.status === 'loading'}>
      <header className={styles.sectionHeader}>
        <div><h2 id="document-analytics-heading">Обработка документов</h2><p className={styles.sectionDescription}>Сравнение времени обработки, размера и формата файла</p></div>
        <div className={styles.filters}>
          <Select label="Формат" value={format} onChange={setFormat} options={[{ value: 'all', label: 'Все форматы' }, ...formats.map((item) => ({ value: item, label: item }))]} />
          <Select<DocumentSizeFilter> label="Размер" value={size} onChange={setSize} options={sizeOptions} />
        </div>
      </header>

      {state.status === 'loading' && <p className={styles.analyticsLoading} role="status"><span className={styles.loadingText}>Загружаем статистику документов…</span></p>}
      {state.status === 'error' && <div className={styles.loadError} role="alert"><p>Не удалось загрузить статистику документов. Попробуйте ещё раз.</p><button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button></div>}
      {state.status === 'ready' && <dl key={`${period}:${format}:${size}`} className={styles.overview}>
        <div><dt>Загрузок документов</dt><dd><span className={styles.overviewValue}>{numberFormat.format(summary.count)}</span><span className={styles.metricHint}>С учётом повторных загрузок и выбранных фильтров</span></dd></div>
        <div><dt>Объём файлов</dt><dd><span className={styles.overviewValue}>{formatBytes(sizeBytes)}</span><span className={styles.metricHint}>{sizeHint}</span></dd></div>
        <div><dt>Среднее время обработки</dt><dd><span className={styles.overviewValue}>{demoAverage === null ? '—' : numberFormat.format(demoAverage)}<small>с</small></span></dd></div>
      </dl>}

      {state.status === 'ready' && <section key={`formats:${period}:${format}:${size}`} className={styles.comparison} aria-labelledby="document-formats-heading">
        <h3 id="document-formats-heading">Загруженные файлы по форматам</h3>
        <p className={styles.sectionDescription}>Доля от всех загрузок в выбранной выборке, включая повторные загрузки</p>
        {summary.count === 0 ? <p className={styles.analyticsLoading}>Нет загрузок с выбранными фильтрами</p> : <>
          <div className={styles.formatChart} role="img" aria-label={formatGroups.map((group, index) => group.label + ': ' + numberFormat.format(formatCounts[index] / summary.count * 100) + ' %, файлов: ' + formatCounts[index]).join('; ')}>
            <div className={styles.formatPlot}>
              {ticks.map((tick) => <div key={tick} className={styles.formatGrid} style={{ bottom: tick * 100 + '%' }}><span>{tick * 100}%</span></div>)}
              <div className={styles.formatColumns}>
                {formatGroups.map((group, index) => {
                  const percent = formatCounts[index] / summary.count * 100
                  return <div key={group.label} className={styles.formatColumn}>
                    <div className={styles.formatBar} style={{ height: percent + '%' }} title={group.label + ': ' + formatCounts[index] + ' из ' + summary.count}>
                      <span className={styles.formatPercent}>{numberFormat.format(percent)}%</span>
                    </div>
                    <span className={styles.formatName}>{group.label}</span>
                  </div>
                })}
              </div>
            </div>
          </div>
        </>}
      </section>}

    </section>
  )
}
