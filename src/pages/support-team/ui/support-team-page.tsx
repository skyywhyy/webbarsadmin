import { useEffect, useState } from 'react'
import { Toast, useToast } from '@/shared/ui/toast'
import { loadEmployees } from '../model/employees'
import type { Employee } from '../model/employees'
import { EmployeeDialog } from './employee-dialog'
import { EmployeeActionDialog } from './employee-action-dialog'
import styles from './support-team-page.module.css'

const pageSize = 4

export function SupportTeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [dialog, setDialog] = useState<'invite' | 'add' | null>(null)
  const [action, setAction] = useState<{ kind: 'edit' | 'delete'; employee: Employee } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const { toast, showToast } = useToast()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const offset = (page - 1) * pageSize

  useEffect(() => {
    const controller = new AbortController()
    loadEmployees(page, pageSize, controller.signal)
      .then((result) => {
        setEmployees(result.items)
        setTotal(result.total)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Не удалось загрузить сотрудников. Попробуйте ещё раз.')
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [page, revision])

  function changePage(next: number) {
    if (next === page) return
    setLoading(true)
    setPage(next)
  }

  function handleEmployeeAdded() {
    setDialog(null)
    setLoading(true)
    setPage(1)
    setRevision((value) => value + 1)
    showToast('Сотрудник добавлен')
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}><h1>Список клиентов</h1></header>
      <div className={styles.toolbar}>
        <button type="button" className={styles.secondaryButton} onClick={() => setDialog('invite')}>Пригласить по ссылке</button>
        <button type="button" className={styles.primaryButton} onClick={() => setDialog('add')}>Добавить пользователя</button>
      </div>
      <section aria-labelledby="employees-heading">
        <h2 className={styles.sectionHeading} id="employees-heading">Сотрудники</h2>
        {error && !loading && (
          <div className={styles.loadError} role="alert">
            <div>
              <p className={styles.loadErrorTitle}>Не удалось загрузить сотрудников</p>
              <p className={styles.loadErrorDescription}>Попробуйте обновить список чуть позже.</p>
            </div>
            <button className={styles.retryButton} type="button" onClick={() => { setError(''); setLoading(true); setRevision((value) => value + 1) }}>Попробовать снова</button>
          </div>
        )}
        {loading && <p role="status">Загрузка сотрудников…</p>}
        {!loading && !error && (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-labelledby="employees-heading">
                <colgroup><col /><col /><col /><col className={styles.actionColumn} /></colgroup>
                <thead><tr><th scope="col">Имя и фамилия</th><th scope="col">Telegram</th><th scope="col">ID пользователя</th><th scope="col"><span className={styles.visuallyHidden}>Действия</span></th></tr></thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <th scope="row">{[employee.first_name, employee.last_name].filter(Boolean).join(' ') || '—'}</th>
                      <td>{employee.username ? '@' + employee.username.replace(/^@/, '') : '—'}</td>
                      <td>{employee.telegram_id}</td>
                      <td>
                        <details className={styles.employeeActions} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }} onKeyDown={(event) => { if (event.key === 'Escape' && event.currentTarget.open) { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}>
                          <summary className={styles.iconButton} aria-label={'Действия сотрудника ' + ([employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.telegram_id)}>···</summary>
                          <div className={styles.actionList}>
                            <button type="button" onClick={(event) => { event.currentTarget.closest('details')!.open = false; setAction({ kind: 'edit', employee }) }}>Изменить данные</button>
                            <button type="button" onClick={(event) => { event.currentTarget.closest('details')!.open = false; setAction({ kind: 'delete', employee }) }}>Удалить сотрудника</button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                  {!employees.length && <tr><td colSpan={4} className={styles.empty}>В команде пока нет сотрудников</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className={styles.footer}>
              <p aria-live="polite">Показано {employees.length ? (offset + 1) + '–' + (offset + employees.length) : 0} из {total}</p>
              <nav className={styles.pagination} aria-label="Страницы списка сотрудников">
                <button className={styles.pageArrow} type="button" aria-label="Предыдущая страница" disabled={page === 1} onClick={() => changePage(page - 1)}>‹</button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                  <button key={number} type="button" aria-label={'Страница ' + number} aria-current={number === page ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>
                ))}
                <button className={styles.pageArrow} type="button" aria-label="Следующая страница" disabled={page === pageCount} onClick={() => changePage(page + 1)}>›</button>
              </nav>
            </footer>
          </>
        )}
      </section>
      <Toast message={toast} />
      {dialog && <EmployeeDialog kind={dialog} onClose={() => setDialog(null)} onAdded={handleEmployeeAdded} />}
      {action && <EmployeeActionDialog action={action} onClose={() => setAction(null)} onDeleted={() => { setAction(null); setLoading(true); if (employees.length === 1 && page > 1) setPage(page - 1); else setRevision((value) => value + 1); showToast('Сотрудник удалён') }} />}
    </main>
  )
}

