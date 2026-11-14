import { useState } from 'react'
import type { MouseEvent } from 'react'
import { loadEmployees, saveEmployees } from '../model/employees'
import type { Employee } from '../model/employees'
import { EmployeeDialog } from './employee-dialog'
import type { EmployeeDialogState } from './employee-dialog'
import styles from './support-team-page.module.css'

const pageSize = 4

export function SupportTeamPage() {
  const [employees, setEmployees] = useState(loadEmployees)
  const [requestedPage, setRequestedPage] = useState(1)
  const [dialog, setDialog] = useState<EmployeeDialogState | null>(null)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const pageCount = Math.max(1, Math.ceil(employees.length / pageSize))
  const page = Math.min(requestedPage, pageCount)
  const offset = (page - 1) * pageSize
  const rows = employees.slice(offset, offset + pageSize)

  function commitEmployees(next: Employee[], nextMessage: string) {
    try {
      saveEmployees(next)
    } catch {
      setSaveError('Браузер не смог сохранить изменения. Повторите попытку.')
      return
    }
    setEmployees(next)
    setRequestedPage(dialog?.kind === 'add' ? 1 : Math.min(page, Math.max(1, Math.ceil(next.length / pageSize))))
    setDialog(null)
    setSaveError('')
    setMessage(nextMessage)
  }

  function openEmployeeAction(event: MouseEvent<HTMLButtonElement>, state: EmployeeDialogState) {
    const menu = event.currentTarget.closest('details')
    menu?.querySelector('summary')?.focus()
    if (menu) menu.open = false
    setDialog(state)
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <h1>Команда поддержки</h1>
      </header>

      <div className={styles.toolbar}>
        <button type="button" className={styles.secondaryButton} onClick={() => setDialog({ kind: 'invite' })}>
          Пригласить по ссылке
        </button>
        <button type="button" className={styles.primaryButton} onClick={() => setDialog({ kind: 'add' })}>
          Добавить пользователя
        </button>
      </div>

      <section aria-labelledby="employees-heading">
        <h2 className={styles.sectionHeading} id="employees-heading">Сотрудники</h2>
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-labelledby="employees-heading">
            <colgroup><col /><col /><col /><col /></colgroup>
            <thead>
              <tr>
                <th scope="col">Имя и фамилия</th>
                <th scope="col">Telegram</th>
                <th scope="col">ID пользователя</th>
                <th scope="col"><span className={styles.visuallyHidden}>Действия</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => {
                const name = employee.firstName + ' ' + employee.lastName

                return (
                  <tr key={employee.id}>
                    <th scope="row">{name}</th>
                    <td>@{employee.username}</td>
                    <td>{employee.telegramId ?? '—'}</td>
                    <td className={styles.actionCell}>
                      <details
                        className={styles.employeeActions}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape' && event.currentTarget.open) {
                            event.currentTarget.querySelector('summary')?.focus()
                            event.currentTarget.open = false
                          }
                        }}
                      >
                        <summary className={styles.iconButton} aria-label={'Действия: ' + name}>···</summary>
                        <div className={styles.actionList}>
                          <button type="button" onClick={(event) => openEmployeeAction(event, { kind: 'edit', employee })}>Изменить данные</button>
                          <button type="button" onClick={(event) => openEmployeeAction(event, { kind: 'delete', employee })}>Удалить сотрудника</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={4} className={styles.empty}>В команде пока нет сотрудников</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className={styles.footer}>
          <p aria-live="polite">
            Показано {rows.length ? (offset + 1) + '–' + (offset + rows.length) : 0} из {employees.length}
          </p>
          <nav className={styles.pagination} aria-label="Страницы списка сотрудников">
            <button className={styles.pageArrow} type="button" aria-label="Предыдущая страница" disabled={page === 1} onClick={() => setRequestedPage(page - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                aria-label={'Страница ' + number}
                aria-current={number === page ? 'page' : undefined}
                onClick={() => setRequestedPage(number)}
              >
                {number}
              </button>
            ))}
            <button className={styles.pageArrow} type="button" aria-label="Следующая страница" disabled={page === pageCount} onClick={() => setRequestedPage(page + 1)}>›</button>
          </nav>
        </footer>
      </section>

      {message && <p className={styles.visuallyHidden} role="status">{message}</p>}
      {dialog && (
        <EmployeeDialog
          state={dialog}
          employees={employees}
          saveError={saveError}
          onClose={() => {
            setDialog(null)
            setSaveError('')
          }}
          onSave={commitEmployees}
        />
      )}
    </main>
  )
}
