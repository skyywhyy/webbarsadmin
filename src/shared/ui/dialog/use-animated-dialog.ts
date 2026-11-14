import { useRef } from 'react'

export function useAnimatedDialog() {
  const dialog = useRef<HTMLDialogElement>(null)
  const closing = useRef<Promise<void> | null>(null)

  function closeDialog() {
    if (closing.current) return closing.current
    const element = dialog.current
    if (!element?.open) return Promise.resolve()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof element.getAnimations !== 'function') {
      element.close()
      return Promise.resolve()
    }

    element.dataset.closing = 'true'
    element.inert = true
    closing.current = Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)))
      .then(() => {
        if (dialog.current === element && element.open) element.close()
      })
      .finally(() => {
        element.inert = false
        delete element.dataset.closing
        closing.current = null
      })
    return closing.current
  }

  return { dialog, closeDialog }
}
