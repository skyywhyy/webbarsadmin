import { useLayoutEffect, useRef, useState } from 'react'

export function useAnimatedRows({ animateNewRows = false }: { animateNewRows?: boolean } = {}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const positions = useRef<Map<string, number> | null>(null)
  const knownRows = useRef(new Set<string>())
  const [isRemoving, setIsRemoving] = useState(false)

  useLayoutEffect(() => {
    const previous = positions.current
    positions.current = null
    const rows = Array.from(bodyRef.current?.rows ?? [])
    const existing = knownRows.current
    knownRows.current = new Set(rows.map((row) => row.dataset.rowId ?? ''))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const bodyTop = bodyRef.current?.getBoundingClientRect().top ?? 0
    let newRowIndex = 0
    for (const row of rows) {
      const id = row.dataset.rowId
      if (!id || typeof row.animate !== 'function') continue
      if (animateNewRows && !existing.has(id)) {
        row.animate([
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 900, delay: Math.min(newRowIndex * 70, 280), easing: 'cubic-bezier(0.2, 0, 0.2, 1)', fill: 'backwards' })
        newRowIndex += 1
        continue
      }
      const top = previous?.get(id)
      if (top === undefined) continue
      const distance = top - (row.getBoundingClientRect().top - bodyTop)
      if (!distance) continue
      row.animate([
        { transform: `translateY(${distance}px)` },
        { transform: 'translateY(0)' },
      ], { duration: 650, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' })
    }
  })

  async function removeRow(id: string, onRemove: () => void) {
    setIsRemoving(true)
    try {
      const body = bodyRef.current
      const row = body && Array.from(body.rows).find((item) => item.dataset.rowId === id)
      if (row && typeof row.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const animation = row.animate([
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(8px)' },
        ], { duration: 650, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
        await animation.finished.catch(() => undefined)
        if (bodyRef.current === body) {
          const bodyTop = body.getBoundingClientRect().top
          positions.current = new Map(Array.from(body.rows).map((item) => [item.dataset.rowId ?? '', item.getBoundingClientRect().top - bodyTop]))
        }
      }
      onRemove()
    } finally {
      setIsRemoving(false)
    }
  }

  return { bodyRef, removeRow, isRemoving }
}
