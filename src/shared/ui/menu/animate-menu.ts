import type { SyntheticEvent } from 'react'

export function animateMenu(event: SyntheticEvent<HTMLDetailsElement>) {
  const details = event.currentTarget
  const panel = details.querySelector<HTMLElement>('[data-menu-panel]')
  if (!panel) return
  panel.getAnimations?.().forEach((animation) => animation.cancel())
  if (!details.open || typeof panel.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const offset = getComputedStyle(panel).getPropertyValue('--menu-enter-y').trim() || '-4px'
  panel.animate([
    { opacity: 0, transform: `translateY(${offset})` },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 450, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' })
}
