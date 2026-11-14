import { Link, NavLink } from 'react-router'
import analyticsIcon from '@/assets/analytics.svg'
import barsLogo from '@/assets/bars-logo.svg'
import employeesIcon from '@/assets/employees.svg'
import knowledgeIcon from '@/assets/knowledge.svg'
import '@/assets/golos.css'
import styles from './sidebar.module.css'

const navItems: ReadonlyArray<{ label: string; icon: string; to?: string }> = [
  { label: 'Аналитика', icon: analyticsIcon, to: '/' },
  { label: 'Сотрудники', icon: employeesIcon, to: '/employees' },
  { label: 'База знаний', icon: knowledgeIcon },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <Link to="/" className={styles.brand}>
        <img src={barsLogo} alt="БАРС Груп" />
      </Link>

      <nav className={styles.navigation} aria-label="Основная навигация">
        {navItems.map(({ label, icon, to }) => {
          const content = (
            <>
              <span className={styles.icon}>
                <img src={icon} alt="" />
              </span>
              {label}
            </>
          )

          return to ? (
            <NavLink key={label} to={to} end className={styles.item}>
              {content}
            </NavLink>
          ) : (
            <span key={label} role="link" aria-disabled="true" className={styles.item}>
              {content}
            </span>
          )
        })}
      </nav>
    </aside>
  )
}

