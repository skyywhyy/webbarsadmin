import { useEffect, useRef, useState } from 'react'

export const toastDuration = 5_000

export type ToastMessage = {
  id: number
  kind: 'success' | 'error'
  text: string
}

export function useToast() {
  const nextId = useRef(0)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    if (!toast) return

    const timeout = window.setTimeout(() => {
      setToast((current) => current === toast ? null : current)
    }, toastDuration)

    return () => window.clearTimeout(timeout)
  }, [toast])

  function showToast(text: string, kind: ToastMessage['kind'] = 'success') {
    nextId.current += 1
    setToast({ id: nextId.current, kind, text })
  }

  return { toast, showToast }
}
