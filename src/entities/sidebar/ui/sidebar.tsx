import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
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
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topbar}>
        <Link to="/" className={styles.brand} onClick={() => setOpen(false)}>
          <img src={barsLogo} alt="БАРС Груп" />
        </Link>
        <button
          ref={toggle}
          type="button"
          className={styles.toggle}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && <button type="button" className={styles.backdrop} aria-label="Закрыть меню" onClick={() => setOpen(false)} />}
      <nav id="main-navigation" className={styles.navigation} data-open={open} aria-label="Основная навигация">
        {navItems.map(({ label, icon, to }) => (
          <NavLink key={to} to={to} end className={styles.item} onClick={() => setOpen(false)}>
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
