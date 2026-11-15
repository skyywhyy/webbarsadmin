import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './select.module.css'

type SelectOption<T extends string> = { value: T; label: string }

type SelectProps<T extends string> = {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  className?: string
  icon?: ReactNode
}

export function Select<T extends string>({ label, value, options, onChange, className, icon }: SelectProps<T>) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const highlightedIndex = Math.min(activeIndex, options.length - 1)
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!isOpen) return
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, highlightedIndex])

  function open() {
    setActiveIndex(selectedIndex)
    search.current = { text: '', time: 0 }
    setIsOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (options.length === 0) return
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex(isOpen ? (highlightedIndex + direction + options.length) % options.length : selectedIndex)
        setIsOpen(true)
        return
      }
      case 'Home':
      case 'End':
        event.preventDefault()
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
        setIsOpen(true)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (isOpen) choose(highlightedIndex)
        else open()
        return
      case 'Escape':
        if (isOpen) {
          event.preventDefault()
          event.stopPropagation()
          setIsOpen(false)
        }
        return
      case 'Tab':
        setIsOpen(false)
        return
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    const now = Date.now()
    const text = (now - search.current.time < 700 ? search.current.text : '') + event.key.toLocaleLowerCase()
    search.current = { text, time: now }
    const query = [...text].every((letter) => letter === text[0]) ? text[0] : text
    const start = isOpen ? highlightedIndex : selectedIndex
    for (let step = query.length === 1 ? 1 : 0; step <= options.length; step += 1) {
      const index = (start + step) % options.length
      if (options[index].label.toLocaleLowerCase().startsWith(query)) {
        setActiveIndex(index)
        setIsOpen(true)
        break
      }
    }
  }

  return (
    <div ref={rootRef} className={[styles.field, className].filter(Boolean).join(' ')} data-open={isOpen} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
    }}>
      <label id={`${id}-label`} htmlFor={id} className={styles.label}>{label}</label>
      <button ref={triggerRef} id={id} type="button" role="combobox" className={styles.trigger}
        aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={isOpen}
        aria-controls={`${id}-list`} aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
        disabled={options.length === 0} onKeyDown={handleKeyDown} onClick={() => { if (isOpen) setIsOpen(false); else open() }}>
        <span id={`${id}-value`} className={styles.value}>{selected?.label ?? '—'}</span>
        {icon ? <span className={styles.icon} aria-hidden="true">{icon}</span> : (
          <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        )}
      </button>
      {isOpen && <div ref={listRef} id={`${id}-list`} className={styles.list} role="listbox" aria-labelledby={`${id}-label`}>
        {options.map((option, index) => <button key={option.value} id={`${id}-option-${index}`} type="button" role="option" tabIndex={-1}
          className={styles.option} aria-selected={option.value === value} data-active={index === highlightedIndex}
          onPointerMove={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
          <span>{option.label}</span>
          {option.value === value && <svg className={styles.check} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
        </button>)}
      </div>}
    </div>
  )
}
