import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Select } from '@/shared/ui/select'
import { DocumentAnalytics } from './document-analytics'
import { RequestAnalytics } from './request-analytics'
import { technicalRanges } from '../model/technical-analytics'
import type { TechnicalRange } from '../model/technical-analytics'
import styles from './home-page.module.css'

const tabs = [{ id: 'requests', label: 'Обращения' }, { id: 'documents', label: 'Документы' }] as const
const calendarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M7 3v4M17 3v4M3 10h18" />
  </svg>
)

export function HomePage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('requests')
  const [range, setRange] = useState<TechnicalRange>('24h')

  function switchTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    setActiveTab(tabs[next].id)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <main className={styles.analytics}>
      <header className={styles.header}>
        <h1>{activeTab === 'requests' ? 'Аналитика обращений' : 'Аналитика документов'}</h1>
        {activeTab === 'requests' ? (
          <Select<TechnicalRange> key="requests" className={styles.period} label="Период" value={range} onChange={setRange} options={technicalRanges} icon={calendarIcon} />
        ) : (
          <p className={styles.documentPeriod}><span aria-hidden="true">{calendarIcon}</span>За всё время</p>
        )}
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Разделы аналитики">
        {tabs.map((tab, index) => (
          <button key={tab.id} id={'analytics-tab-' + tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={'analytics-panel-' + tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => switchTab(event, index)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'requests' ? (
        <div key="requests" className={styles.tabPanel} role="tabpanel" id="analytics-panel-requests" aria-labelledby="analytics-tab-requests">
          <RequestAnalytics key={range} range={range} />
        </div>
      ) : (
        <div key="documents" className={styles.tabPanel} role="tabpanel" id="analytics-panel-documents" aria-labelledby="analytics-tab-documents"><DocumentAnalytics /></div>
      )}
    </main>
  )
}
