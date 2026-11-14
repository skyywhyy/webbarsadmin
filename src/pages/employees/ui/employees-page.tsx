import { useState } from 'react'
import { Sidebar } from '@/entities/sidebar'
import styles from './employees-page.module.css'

const employees = [
  { id: '102483761', name: 'Анна Смирнова', telegram: '@anna_smirnova' },
  { id: '208517394', name: 'Дмитрий Волков', telegram: '@dmitry_volkov' },
  { id: '315628470', name: 'Екатерина Морозова', telegram: '@ekaterina_m' },
  { id: '427391805', name: 'Ольга Соколова', telegram: '@olga_sokolova' },
]

const pageSize = 4

export function EmployeesPage() {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(employees.length / pageSize))
  const firstIndex = (page - 1) * pageSize
  const visibleEmployees = employees.slice(firstIndex, firstIndex + pageSize)

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <header className={styles.header}>
          <h1>Команда поддержки</h1>
        </header>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled>Пригласить по ссылке</button>
          <button type="button" className={styles.primary} disabled>Добавить пользователя</button>
        </div>

        <section aria-labelledby="employees-title">
          <h2 id="employees-title">Сотрудники</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Имя и фамилия</th>
                  <th scope="col">Telegram</th>
                  <th scope="col">ID пользователя</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.telegram}</td>
                    <td>{employee.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>Показано {firstIndex + 1}–{Math.min(firstIndex + pageSize, employees.length)} из {employees.length}</span>
            <nav className={styles.pageControls} aria-label="Страницы сотрудников">
              <button type="button" aria-label="Предыдущая страница" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  aria-label={`Страница ${number}`}
                  aria-current={page === number ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
              <button type="button" aria-label="Следующая страница" disabled={page === pageCount} onClick={() => setPage(page + 1)}>›</button>
            </nav>
          </div>
        </section>
      </main>
    </div>
  )
}
