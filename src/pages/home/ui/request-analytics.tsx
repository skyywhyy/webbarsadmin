import { useEffect, useId, useState } from 'react'
import { loadTechnicalAnalytics } from '../model/api'
import { formatMetric, formatMilliseconds, summarizeTechnicalAnalytics } from '../model/technical-analytics'
import type { TechnicalAnalytics, TechnicalRange } from '../model/technical-analytics'
import { RequestCostMetrics } from './request-cost-metric'
import styles from './home-page.module.css'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: TechnicalAnalytics }

export function RequestAnalytics({ range }: { range: TechnicalRange }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const donutRevealId = useId()

  useEffect(() => {
    const controller = new AbortController()
    loadTechnicalAnalytics(range, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'ready', data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [range, attempt])

  if (state.status === 'loading') return <p className={styles.analyticsLoading} role="status"><span className={styles.loadingText}>Загружаем аналитику…</span></p>
  if (state.status === 'error') return (
    <div className={styles.loadError} role="alert">
      <p>Не удалось загрузить аналитику. Попробуйте ещё раз.</p>
      <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</button>
    </div>
  )

  const { data } = state
  const summary = summarizeTechnicalAnalytics(data)
  const breakdownTime = formatMilliseconds(summary.breakdownMeanMs)
  const hasStageData = summary.stages.some((stage) => stage.percent !== null && stage.percent > 0)

  return (
    <>
      <dl className={`${styles.overview} ${styles.requestOverview}`}>
        <div>
          <dt>Среднее число токенов на ответ</dt>
          <dd><span className={styles.overviewValue}>{formatMetric(summary.tokensPerResponse)}<small>токенов</small></span></dd>
        </div>
        <RequestCostMetrics key={data.from_at + data.to_at} fromAt={data.from_at} toAt={data.to_at} />
      </dl>

      <div className={styles.detailGrid}>
        <section className={`${styles.detailSection} ${styles.responseSection}`} aria-labelledby="response-stages-heading">
          <h2 id="response-stages-heading">Состав времени ответа</h2>
          <p className={styles.sectionDescription}>Среднее время каждого этапа</p>
          <div className={styles.responseComposition}>
            <div className={styles.responsePlot}>
              <div className={styles.responseDonut} role="img" aria-label={'Среднее время ответа по этапам: ' + breakdownTime + ' с. Время этапов приведено рядом.'}>
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <circle cx="100" cy="100" r="83" fill="none" stroke={hasStageData ? "#fff" : "currentColor"} strokeWidth="18" />
                  <defs>
                    <mask id={donutRevealId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
                      <circle className={styles.donutReveal} cx="100" cy="100" r="83" fill="none" stroke="#fff" strokeWidth="22" pathLength="100" strokeDasharray="100 100" strokeDashoffset="0" transform="rotate(-90 100 100)" />
                    </mask>
                  </defs>
                  <g mask={`url(#${donutRevealId})`}>
                    {summary.stages.map((stage) => {
                      if (stage.percent === null || stage.percent <= 0) return null
                      const gap = Math.min(0.35, stage.percent * 0.2)
                      const length = stage.percent - gap
                      return <circle key={stage.stage} cx="100" cy="100" r="83" fill="none" stroke={stage.color} strokeWidth="18" pathLength="100" strokeDasharray={length + ' ' + (100 - length)} strokeDashoffset={-(stage.offset + gap / 2)} transform="rotate(-90 100 100)" />
                    })}
                  </g>
                </svg>
                <div className={styles.donutCaption} aria-hidden="true">
                  <span className={styles.donutValue}>{breakdownTime} <small>с</small></span>
                  <span className={styles.donutLabel}>Время ответа</span>
                </div>
              </div>
            </div>
            <div className={styles.responseReadout}>
              <dl className={styles.responseLegend}>
                {summary.stages.map((stage) => (
                  <div key={stage.stage}>
                    <dt><span className={styles.legendDot} style={{ background: stage.color }} aria-hidden="true" />{stage.label}</dt>
                    <dd><span className={styles.stageDuration}>{formatMilliseconds(stage.meanMs)} <small>с</small></span><span className={styles.stageShare}>{formatMetric(stage.percent, 2)} %</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <dl className={styles.responseFacts}>
            <div><dt>Учтено запросов</dt><dd>{formatMetric(summary.breakdownSamples)}</dd></div>
            <div><dt>95% ответов быстрее</dt><dd>{formatMilliseconds(data.response_time.p95_ms)}<small>с</small></dd></div>
          </dl>
        </section>

        <section className={`${styles.detailSection} ${styles.tokenSection}`} aria-labelledby="token-usage-heading">
          <h2 id="token-usage-heading">Структура токенов</h2>
          <p className={styles.sectionDescription}>Всего за выбранный период</p>
          <dl className={styles.breakdown}>
            <div><dt className={styles.tokenLabel}><span className={`${styles.legendDot} ${styles.tokenInput}`} aria-hidden="true" />Входящие</dt><dd>{formatMetric(summary.input)}</dd></div>
            <div><dt className={styles.tokenLabel}><span className={`${styles.legendDot} ${styles.tokenOutput}`} aria-hidden="true" />Исходящие</dt><dd>{formatMetric(summary.output)}</dd></div>
            <div className={styles.breakdownTotal}><dt>Всего</dt><dd>{formatMetric(summary.total)}</dd></div>
          </dl>
          <div className={styles.tokenBar} role="img" aria-label={'Входящие токены: ' + formatMetric(summary.input) + ', исходящие: ' + formatMetric(summary.output)}>
            {summary.total > 0 && <><span style={{ width: summary.input / summary.total * 100 + '%' }} /><span style={{ width: summary.output / summary.total * 100 + '%' }} /></>}
          </div>
          <p className={styles.footnote}>Все вызовы моделей в чате. Токены загрузки документов учитываются отдельно.</p>
        </section>
      </div>
    </>
  )
}
