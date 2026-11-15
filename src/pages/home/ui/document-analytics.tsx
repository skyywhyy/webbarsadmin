import { useState } from 'react'
import { createDemoDocuments } from '../model/demo-documents'
import { filterDocuments, formatBytes, summarizeDocuments } from '../model/analytics'
import type { AnalyticsPeriod, DocumentSizeFilter } from '../model/analytics'
import styles from './home-page.module.css'

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const chartFormats = ['PDF', 'DOCX', 'TXT'] as const
const ticks = [0, 0.25, 0.5, 0.75, 1]

export function DocumentAnalytics({ period }: { period: AnalyticsPeriod }) {
  const [documents] = useState(() => createDemoDocuments())
  const [format, setFormat] = useState('all')
  const [size, setSize] = useState<DocumentSizeFilter>('all')
  const formats = [...new Set(documents.map((document) => document.format))].sort()
  const filtered = filterDocuments(documents, { period, format, size })
  const summary = summarizeDocuments(filtered)
  const completed = filtered.filter((document) => document.status === 'succeeded' && document.processingSeconds !== null)
  const average = completed.length ? completed.reduce((sum, document) => sum + (document.processingSeconds ?? 0), 0) / completed.length : null
  const maxSize = Math.max(1, Math.ceil(Math.max(0, ...completed.map((document) => (document.sizeBytes ?? 0) / 1_048_576))))
  const maxSeconds = Math.max(10, Math.ceil(Math.max(0, ...completed.map((document) => document.processingSeconds ?? 0)) / 10) * 10)

  return (
    <section className={styles.documentAnalytics} aria-labelledby="document-analytics-heading">
      <header className={styles.sectionHeader}>
        <div><h2 id="document-analytics-heading">Обработка документов</h2><p className={styles.sectionDescription}>Сравнение времени обработки, размера и формата файла</p></div>
        <div className={styles.filters}>
          <label>Формат<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="all">Все форматы</option>{formats.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Размер<select value={size} onChange={(event) => setSize(event.target.value as DocumentSizeFilter)}><option value="all">Любой размер</option><option value="small">До 1 МБ</option><option value="medium">1–5 МБ</option><option value="large">Больше 5 МБ</option></select></label>
        </div>
      </header>

      <dl className={styles.overview}>
        <div><dt>Загрузок документов</dt><dd><span className={styles.overviewValue}>{numberFormat.format(summary.count)}</span><span className={styles.metricHint}>С учётом повторных загрузок и выбранных фильтров</span></dd></div>
        <div><dt>Объём файлов</dt><dd><span className={styles.overviewValue}>{formatBytes(summary.sizeBytes)}</span><span className={styles.metricHint}>Суммарный размер файлов в выборке</span></dd></div>
        <div><dt>Среднее время обработки</dt><dd><span className={styles.overviewValue}>{average === null ? '—' : numberFormat.format(average)}<small>с</small></span><span className={styles.metricHint}>По завершённым обработкам</span></dd></div>
      </dl>

      <section className={styles.comparison} aria-labelledby="document-comparison-heading">
        <h3 id="document-comparison-heading">Размер файла и время обработки</h3>
        <div className={styles.scatterLegend} aria-label="Форматы на графике">
          {chartFormats.map((item) => <span key={item}><i className={styles.chartDot} data-format={item} aria-hidden="true" />{item}</span>)}
        </div>
        <div className={styles.scatterChart} role="img" aria-describedby={completed.length > 0 ? "document-processing-values" : undefined} aria-label={'Размер файла и время обработки: ' + completed.length + ' завершённых документов.'}>
          <span className={styles.plotYAxis}>Время, с</span>
          <div className={styles.scatterArea}>
            {ticks.map((tick) => <div key={tick} className={styles.scatterGrid} style={{ bottom: tick * 100 + '%' }}><span>{numberFormat.format(maxSeconds * tick)}</span></div>)}
            {ticks.map((tick) => <span key={tick} className={styles.scatterXTick} style={{ left: tick * 100 + '%' }}>{numberFormat.format(maxSize * tick)}</span>)}
            {completed.map((document) => <span key={document.id} className={styles.chartPoint} data-format={document.format} title={document.name + ': ' + formatBytes(document.sizeBytes) + ', ' + numberFormat.format(document.processingSeconds ?? 0) + ' с'} style={{ left: (document.sizeBytes ?? 0) / 1_048_576 / maxSize * 100 + '%', bottom: (document.processingSeconds ?? 0) / maxSeconds * 100 + '%' }} />)}
            {completed.length === 0 && <p className={styles.scatterEmpty}>Нет завершённых обработок с такими параметрами</p>}
          </div>
          <span className={styles.plotXAxis}>Размер файла, МБ</span>
        </div>
        <p id="document-processing-values" hidden>{completed.map((document) => document.name + ": " + formatBytes(document.sizeBytes) + ", " + numberFormat.format(document.processingSeconds ?? 0) + " с").join("; ")}</p>
      </section>

    </section>
  )
}
