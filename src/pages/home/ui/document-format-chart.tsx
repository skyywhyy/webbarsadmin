import { useEffect, useState } from 'react'
import { Select } from '@/shared/ui/select'
import { loadAnalyticsDocuments } from '../model/api'
import { countDocumentFormats, filterDocuments } from '../model/analytics'
import type { AnalyticsDocument, DocumentPeriod, DocumentSizeFilter } from '../model/analytics'
import styles from './home-page.module.css'

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const ticks = [0, 0.25, 0.5, 0.75, 1]
const sizeOptions = [
  { value: 'all', label: 'Любой размер' },
  { value: 'small', label: 'Меньше 1 МБ' },
  { value: 'medium', label: '1–5 МБ' },
  { value: 'large', label: 'Больше 5 МБ' },
] as const
type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; documents: AnalyticsDocument[] }

export function DocumentFormatChart({ period }: { period?: DocumentPeriod } = {}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
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
  const formats = [...new Set([...documents.map((document) => document.format), ...(format === 'all' ? [] : [format])])].sort()
  const filteredDocuments = filterDocuments(documents, { format, size, period })
  const count = filteredDocuments.length
  const formatGroups = countDocumentFormats(filteredDocuments)

  return (
    <section className={styles.comparison} aria-labelledby="document-formats-heading" aria-busy={state.status === 'loading'}>
      <header className={styles.sectionHeader}>
        <div>
          <h3 id="document-formats-heading">Загруженные файлы по форматам</h3>
          <p className={styles.sectionDescription}>Фильтры применяются только к диаграмме</p>
        </div>
        <div className={styles.filters}>
          <Select label="Формат" value={format} onChange={setFormat} options={[{ value: 'all', label: 'Все форматы' }, ...formats.map((item) => ({ value: item, label: item }))]} />
          <Select<DocumentSizeFilter> label="Размер" value={size} onChange={setSize} options={sizeOptions} />
        </div>
      </header>
      {state.status === 'loading' && <p className={styles.analyticsLoading} role="status"><span className={styles.loadingText}>Загружаем диаграмму…</span></p>}
      {state.status === 'error' && (
        <div className={styles.loadError} role="alert">
          <p>Не удалось загрузить диаграмму. Попробуйте ещё раз.</p>
          <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button>
        </div>
      )}
      {state.status === 'ready' && (count === 0 ? <p className={styles.analyticsLoading}>Нет загрузок с выбранными фильтрами</p> : (
        <div key={format + ':' + size + ':' + (period?.range ?? 'all')} className={styles.formatChart} tabIndex={0} role="img" aria-label={formatGroups.map((group) => group.label + ': ' + numberFormat.format(group.count / count * 100) + ' %, загрузок: ' + group.count).join('; ')}>
          <div className={styles.formatPlot} style={{ minWidth: formatGroups.length * 80 - 16 }}>
            {ticks.map((tick) => <div key={tick} className={styles.formatGrid} style={{ bottom: tick * 100 + '%' }}><span>{tick * 100}%</span></div>)}
            <div className={styles.formatColumns} style={{ gridTemplateColumns: `repeat(${formatGroups.length}, minmax(0, 1fr))` }}>
              {formatGroups.map((group) => {
                const percent = group.count / count * 100
                return <div key={group.label} className={styles.formatColumn}>
                  <div className={styles.formatBar} style={{ height: percent + '%' }} title={group.label + ': ' + group.count + ' из ' + count}>
                    <span className={styles.formatPercent}>{numberFormat.format(percent)}%</span>
                  </div>
                  <span className={styles.formatName}>{group.label}</span>
                </div>
              })}
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
