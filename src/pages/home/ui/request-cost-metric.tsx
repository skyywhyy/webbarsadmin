import { useEffect, useState } from 'react'
import { loadRequestCost } from '../model/api'
import { formatMetric } from '../model/technical-analytics'
import type { RequestCost } from '../model/technical-analytics'
import styles from './home-page.module.css'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: RequestCost }

export function RequestCostMetrics({ fromAt, toAt }: { fromAt: string; toAt: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadRequestCost(fromAt, toAt, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'ready', data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [fromAt, toAt, attempt])

  return (
    <>
      <div aria-busy={state.status === 'loading'}>
        <dt>Средняя стоимость обращения</dt>
        <dd>
          <span className={styles.overviewValue}>{state.status === 'loading' ? '…' : formatMetric(state.status === 'ready' ? state.data.mean : null, 2)}<small>₽</small></span>
          {state.status === 'loading' && <span className={styles.metricHint} role="status"><span className={styles.loadingText}>Загружаем стоимость…</span></span>}
          {state.status === 'error' && <span className={styles.metricHint} role="alert">Не удалось загрузить стоимость. <button className={styles.metricRetry} type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button></span>}
        </dd>
      </div>
      <div aria-busy={state.status === 'loading'}>
        <dt>Всего за период</dt>
        <dd><span className={styles.overviewValue}>{state.status === 'loading' ? '…' : formatMetric(state.status === 'ready' ? state.data.total : null, 2)}<small>₽</small></span></dd>
      </div>
    </>
  )
}
