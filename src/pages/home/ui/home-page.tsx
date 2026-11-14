import { Sidebar } from '@/entities/sidebar'
import styles from './home-page.module.css'

export function HomePage() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main>Some text</main>
    </div>
  )
}
