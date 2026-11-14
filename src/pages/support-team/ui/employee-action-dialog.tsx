import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAnimatedDialog } from '@/shared/ui/dialog'
import { deleteEmployee, updateEmployee } from '../model/employees'
import type { Employee } from '../model/employees'
import styles from './support-team-page.module.css'

type Props = {
  action: { kind: 'edit' | 'delete'; employee: Employee }
  onClose: () => void
  onDeleted: () => void
  onUpdated: (employee: Employee) => void
}

export function EmployeeActionDialog({ action, onClose, onDeleted, onUpdated }: Props) {
  const { dialog, closeDialog } = useAnimatedDialog()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { employee } = action

  useEffect(() => {
    dialog.current?.showModal()
  }, [dialog])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const data = new FormData(event.currentTarget)
    setLoading(true)
    setError('')
    try {
      const updated = await updateEmployee(employee.id, String(data.get('firstName') ?? ''), String(data.get('lastName') ?? ''))
      await closeDialog()
      onUpdated(updated)
    } catch {
      setError('Не удалось сохранить изменения. Попробуйте ещё раз.')
      setLoading(false)
    }
  }

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
        <form className={styles.employeeForm} onSubmit={handleSave}>
          <div className={styles.nameFields}>
            <label>Имя<input name="firstName" defaultValue={employee.first_name ?? ''} maxLength={255} disabled={loading} /></label>
            <label>Фамилия<input name="lastName" defaultValue={employee.last_name ?? ''} maxLength={255} disabled={loading} /></label>
          </div>
          <label>Username пользователя Telegram<input defaultValue={employee.username ? '@' + employee.username.replace(/^@/, '') : ''} disabled /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.dialogActions}><button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? 'Сохранение…' : 'Сохранить'}</button></div>
        </form>
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
