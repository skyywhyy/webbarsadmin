import '@/assets/golos.css'
import type { ToastMessage } from './use-toast'
import styles from './toast.module.css'

const channels = [
  { kind: 'success', role: 'status' },
  { kind: 'error', role: 'alert' },
] as const

export function Toast({ message }: { message: ToastMessage | null }) {
  return (
    <div className={styles.viewport}>
      {channels.map(({ kind, role }) => (
        <div key={kind} role={role} aria-atomic="true">
          {message?.kind === kind && (
            <div key={message.id} className={styles.toast} data-kind={kind}>
              <span className={styles.dot} aria-hidden="true" />
              {message.text}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
