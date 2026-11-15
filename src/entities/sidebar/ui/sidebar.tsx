import type { CSSProperties } from 'react'
import { Link, matchPath, NavLink, useLocation } from 'react-router'
import analyticsIcon from '@/assets/analytics.svg'
import barsLogo from '@/assets/bars-logo.svg'
import employeesIcon from '@/assets/employees.svg'
import knowledgeIcon from '@/assets/knowledge.svg'
import '@/assets/golos.css'
import styles from './sidebar.module.css'

const navItems = [
  { label: 'Аналитика', icon: analyticsIcon, to: '/' },
  { label: 'Сотрудники', icon: employeesIcon, to: '/employees' },
  { label: 'База знаний', icon: knowledgeIcon, to: '/knowledge' },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const activeIndex = navItems.findIndex(({ to }) => matchPath({ path: to, end: true }, pathname))

  return (
    <aside className={styles.sidebar}>
      <Link to="/" className={styles.brand}>
        <img src={barsLogo} alt="БАРС Груп" />
      </Link>

      <nav className={styles.navigation} aria-label="Основная навигация" data-has-active={activeIndex >= 0} style={{ '--active-row': Math.max(0, activeIndex) } as CSSProperties}>
        {navItems.map(({ label, icon, to }) => (
          <NavLink key={to} to={to} end className={styles.item}>
            <span
              aria-hidden="true"
              className={styles.icon}
              style={{ maskImage: `url("${icon}")` }}
            />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
