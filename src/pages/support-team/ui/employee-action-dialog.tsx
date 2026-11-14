import { useEffect, useState } from 'react'
import { useAnimatedDialog } from '@/shared/ui/dialog'
import { deleteEmployee } from '../model/employees'
import type { Employee } from '../model/employees'
import styles from './support-team-page.module.css'

type Props = {
  action: { kind: 'edit' | 'delete'; employee: Employee }
  onClose: () => void
  onDeleted: () => void
}

export function EmployeeActionDialog({ action, onClose, onDeleted }: Props) {
  const { dialog, closeDialog } = useAnimatedDialog()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { employee } = action

  useEffect(() => {
    dialog.current?.showModal()
  }, [dialog])

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      await deleteEmployee(employee.id)
      await closeDialog()
      onDeleted()
    } catch {
      setError('Не удалось удалить сотрудника. Попробуйте ещё раз.')
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialog} onClose={onClose} onCancel={(event) => { event.preventDefault(); if (!loading) void closeDialog() }} className={`${styles.dialog} ${styles.employeeDialog}`} aria-labelledby="employee-action-title">
      <header className={styles.dialogHeader}>
        <h2 id="employee-action-title">{action.kind === 'edit' ? 'Данные сотрудника' : 'Удалить сотрудника?'}</h2>
        <button className={`${styles.iconButton} ${styles.dialogClose}`} type="button" onClick={() => void closeDialog()} aria-label="Закрыть" disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </header>
      {action.kind === 'edit' ? (
        <div className={styles.employeeForm}>
          <div className={styles.nameFields}>
            <label>Имя<input defaultValue={employee.first_name ?? ''} disabled /></label>
            <label>Фамилия<input defaultValue={employee.last_name ?? ''} disabled /></label>
          </div>
          <label>Username пользователя Telegram<input defaultValue={employee.username ? '@' + employee.username.replace(/^@/, '') : ''} disabled /></label>
          <p>Изменение данных пока недоступно.</p>
          <div className={styles.dialogActions}><button className={styles.primaryButton} type="button" disabled>Сохранить</button></div>
        </div>
      ) : (
        <>
          <p>{[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.telegram_id}{employee.username ? ' · @' + employee.username.replace(/^@/, '') : ''}</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button className={styles.deleteButton} type="button" onClick={handleDelete} disabled={loading}>{loading ? 'Удаление…' : 'Удалить сотрудника'}</button>
          </div>
        </>
      )}
    </dialog>
  )
}
