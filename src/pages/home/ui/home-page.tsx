import chart from '@/assets/chart.svg'
import '@/assets/golos.css'
import { Sidebar } from '@/entities/sidebar'
import styles from './home-page.module.css'

const topics = [
  { label: 'Доступ и авторизация', count: 968, share: 34 },
  { label: 'Работа с системой', count: 769, share: 27 },
  { label: 'Технические ошибки', count: 626, share: 22 },
  { label: 'Другие вопросы', count: 484, share: 17 },
]

const chartValues = [160, 120, 80, 40]
const chartDates = ['1 окт', '7 окт', '14 окт', '21 окт', '30 окт']

export function HomePage() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.analytics}>
        <header className={styles.header}>
          <h1>Аналитика обращений</h1>
          <label className={styles.period}>
            Период
            <span className={styles.periodField}>
              <select defaultValue="2026-10" className={styles.periodSelect}>
                <option value="2026-10">1–30 октября 2026</option>
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
              <dd className={styles.successRate}>76,2%</dd>
              <dd className={styles.successCount}>1 829 успешных из 2 400 попыток</dd>
            </div>
            <div className={styles.metric}>
              <dt>всего обращений</dt>
              <dd>2 847</dd>
            </div>
            <div className={styles.metric}>
              <dt>передано специалистам</dt>
              <dd>1 018</dd>
            </div>
          </dl>
        </section>

        <section className={styles.trend} aria-labelledby="trend-heading">
          <div className={styles.trendHeader}>
            <h2 id="trend-heading">Динамика обращений</h2>
            <ul className={styles.legend} aria-label="Серии графика">
              <li><span aria-hidden="true">●</span> Обращения</li>
              <li><span aria-hidden="true">●</span> Успешные автоответы</li>
            </ul>
          </div>
          <figure className={styles.chart}>
            <div className={styles.chartValues} aria-hidden="true">
              {chartValues.map((value) => <span key={value}>{value}</span>)}
            </div>
            <img
              className={styles.chartImage}
              src={chart}
              alt="С 1 по 30 октября количество обращений и успешных автоответов в целом росло. Число автоответов оставалось ниже общего числа обращений."
            />
            <div className={styles.chartDates} aria-hidden="true">
              {chartDates.map((date) => <span key={date}>{date}</span>)}
            </div>
          </figure>
        </section>

        <section className={styles.topics} aria-labelledby="topics-heading">
          <h2 id="topics-heading">Темы обращений</h2>
          <dl className={styles.topicList}>
            {topics.map(({ label, count, share }) => (
              <div className={styles.topic} key={label}>
                <dt>{label}</dt>
                <dd className={styles.topicCount}>{count}</dd>
                <dd className={styles.topicShare}>{share}%</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  )
}
