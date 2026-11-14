import { Link } from 'react-router'
import barsLogo from '@/assets/bars-logo.svg'
import '@/shared/ui/entry-page.css'
import styles from './not-found-page.module.css'

export function NotFoundPage() {
  return (
    <main className="entry-page">
      <img className="entry-brand" src={barsLogo} alt="БАРС Груп" />
      <section className={`entry-content ${styles.content}`}>
        <h1>Страница не найдена</h1>
        <p className="entry-description">Ошибка 404. Проверьте адрес страницы.</p>
        <Link className={`entry-action ${styles.action}`} to="/">На главную</Link>
      </section>
    </main>
  )
}
