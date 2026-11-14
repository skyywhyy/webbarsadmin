import '@/assets/golos.css'
import { createPortal } from 'react-dom'
import type { ToastMessage } from './use-toast'
import { toastDuration } from './use-toast'
import styles from './toast.module.css'

const channels = [
  { kind: 'success', role: 'status' },
  { kind: 'error', role: 'alert' },
] as const

export function Toast({ message }: { message: ToastMessage | null }) {
  return createPortal(
    <div className={styles.viewport}>
      {channels.map(({ kind, role }) => (
        <div key={kind} role={role} aria-atomic="true">
          {message?.kind === kind && (
            <div key={message.id} className={styles.toast} data-kind={kind} style={{ animationDuration: `${toastDuration}ms` }}>
              <span className={styles.dot} aria-hidden="true" />
              {message.text}
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body,
  )
}
