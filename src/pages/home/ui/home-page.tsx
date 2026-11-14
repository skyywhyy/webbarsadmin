import '@/assets/golos.css'
import styles from './home-page.module.css'

export function HomePage() {
  return (
    <main className={styles.analytics}>
      <header className={styles.header}>
        <h1>Аналитика обращений</h1>
        <label className={styles.period}>
          Период
          <span className={styles.periodField}>
            <select className={styles.periodSelect} disabled>
              <option>Нет доступных периодов</option>
            </select>
            <span className={styles.periodChevron} aria-hidden="true">⌄</span>
          </span>
        </label>
      </header>

      <section className={styles.summary} aria-labelledby="automation-heading">
        <div className={styles.summaryHeader}>
          <h2 id="automation-heading">Результат автоматизации</h2>
          <p>Ответы, завершившиеся решением запроса</p>
        </div>
        <dl className={styles.metrics}>
          <div className={styles.successMetric}>
            <dt>успешных автоматических ответов</dt>
            <dd className={styles.successRate} aria-label="Нет данных">—</dd>
          </div>
          <div className={styles.metric}>
            <dt>всего обращений</dt>
            <dd aria-label="Нет данных">—</dd>
          </div>
          <div className={styles.metric}>
            <dt>передано специалистам</dt>
            <dd aria-label="Нет данных">—</dd>
          </div>
        </dl>
      </section>

      <section className={styles.trend} aria-labelledby="trend-heading">
        <h2 id="trend-heading">Динамика обращений</h2>
        <p className={styles.empty}>Нет данных для графика</p>
      </section>

      <section className={styles.topics} aria-labelledby="topics-heading">
        <h2 id="topics-heading">хцуйня просто пиздец какая то </h2>
        <p className={styles.empty}>Нет данных по темам обращений</p>
      </section>
    </main>
  )
}
