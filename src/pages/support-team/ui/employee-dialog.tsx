import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createEmployee } from '../model/employees'
import { InviteForm } from './invite-form'
import styles from './support-team-page.module.css'

type Props = {
  kind: 'invite' | 'add'
  onClose: () => void
  onAdded: () => void
}

export function EmployeeDialog({ kind, onClose, onAdded }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const telegramId = Number(data.get('telegramId'))
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
      setError('Введите корректный числовой Telegram ID.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createEmployee(telegramId, String(data.get('firstName')).trim(), String(data.get('lastName')).trim())
      onAdded()
    } catch {
      setError('Не удалось добавить сотрудника. Проверьте данные и попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialog} onClose={onClose} className={styles.dialog} aria-labelledby="employee-dialog-title">
      <header className={styles.dialogHeader}>
        <h2 id="employee-dialog-title">{kind === 'invite' ? 'Пригласить сотрудника' : 'Добавить пользователя'}</h2>
        <button className={styles.iconButton} type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть">×</button>
      </header>
      {kind === 'invite' ? (
        <InviteForm onClose={() => dialog.current?.close()} />
      ) : (
        <form className={styles.employeeForm} onSubmit={submit}>
          <div className={styles.nameFields}>
            <label>Имя<input name="firstName" placeholder="Введите имя" maxLength={100} /></label>
            <label>Фамилия<input name="lastName" placeholder="Введите фамилию" maxLength={100} /></label>
          </div>
          <label>Telegram ID<input name="telegramId" inputMode="numeric" pattern="[0-9]+" placeholder="Числовой ID пользователя" required /></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? 'Добавление…' : 'Добавить'}</button>
          </div>
        </form>
      )}
    </dialog>
  )
}
