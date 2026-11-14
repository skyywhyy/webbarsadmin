import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent as ReactDragEvent, MouseEvent } from 'react'
import { Toast, useToast } from '@/shared/ui/toast'
import { documentFromFile } from '../model/documents'
import type { KnowledgeDocument } from '../model/documents'
import styles from './knowledge-page.module.css'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' })
const plurals = new Intl.PluralRules('ru-RU')
const documentNouns: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'документ',
  few: 'документа',
  many: 'документов',
}

function documentCount(count: number) {
  return count + ' ' + (documentNouns[plurals.select(count)] ?? 'документов')
}

export function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const { toast, showToast } = useToast()
  const [documentToDelete, setDocumentToDelete] = useState<KnowledgeDocument | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isSyncing, setIsSyncing] = useState(true)
  const [confluenceConnected, setConfluenceConnected] = useState(false)
  const [confluenceError, setConfluenceError] = useState('')
  const [syncVersion, setSyncVersion] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const replacement = useRef<KnowledgeDocument | null>(null)
  const modal = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (documentToDelete) modal.current?.showModal()
  }, [documentToDelete])

  useEffect(() => {
    function preventFileNavigation(event: DragEvent) {
      if (!event.defaultPrevented && event.dataTransfer?.types.includes('Files')) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'none'
      }
    }

    window.addEventListener('dragover', preventFileNavigation)
    window.addEventListener('drop', preventFileNavigation)
    return () => {
      window.removeEventListener('dragover', preventFileNavigation)
      window.removeEventListener('drop', preventFileNavigation)
    }
  }, [])

  function chooseFile(item: KnowledgeDocument | null = null) {
    replacement.current = item
    fileInput.current?.click()
  }

  function putDocument(item: KnowledgeDocument, previous: KnowledgeDocument | null = null) {
    setDocuments((current) => previous
      ? current.map((entry) => entry.id === previous.id ? item : entry)
      : [item, ...current])
  }

  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    const previous = replacement.current
    replacement.current = null
    if (file) addFile(file, previous)
  }

  function addFile(file: File, previous: KnowledgeDocument | null = null) {
    try {
      putDocument(documentFromFile(file, previous?.id), previous)
      showToast(previous ? 'Документ заменён' : 'Файл добавлен')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось добавить файл.', 'error')
    }
  }

  function allowFileDrop(event: ReactDragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function dropFile(event: ReactDragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    setIsDraggingFile(false)

    const files = event.dataTransfer.files
    if (files.length !== 1) {
      showToast('Перетащите один файл PDF, DOCX или TXT.', 'error')
      return
    }

    addFile(files[0])
  }

  function closeMenu(event: MouseEvent<HTMLElement>) {
    const details = event.currentTarget.closest('details')
    if (details) {
      details.querySelector('summary')?.focus()
      details.open = false
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    async function loadConfluence() {
      try {
        const response = await fetch('/local-confluence/search', {
          method: 'POST',
          signal: controller.signal,
        })
        const result = await response.json() as { documents?: KnowledgeDocument[]; error?: string }
        if (!response.ok || !result.documents) throw new Error(result.error || 'Не удалось загрузить документы.')
        if (controller.signal.aborted) return
        const imported = result.documents
        setDocuments((current) => [...imported, ...current.filter((item) => !item.id.startsWith('confluence:'))])
        setConfluenceConnected(true)
        setConfluenceError('')
      } catch (error) {
        if (controller.signal.aborted) return
        setConfluenceConnected(false)
        setConfluenceError(error instanceof Error ? error.message : 'Не удалось подключить Confluence.')
      } finally {
        if (!controller.signal.aborted) setIsSyncing(false)
      }
    }
    void loadConfluence()
    return () => controller.abort()
  }, [syncVersion])

  function openDocument(item: KnowledgeDocument) {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!item.file) return
    const url = URL.createObjectURL(item.file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    if (item.file.type !== 'application/pdf' && item.file.type !== 'text/plain') anchor.download = item.name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function deleteDocument(item: KnowledgeDocument) {
    setIsDeleting(true)
    setDeleteError('')
    try {
      if (item.url) {
        if (!item.confluenceType || !item.id.startsWith('confluence:')) throw new Error('Не удалось определить тип документа Confluence.')
        const response = await fetch('/local-confluence/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id.slice('confluence:'.length), type: item.confluenceType }),
        })
        const result = await response.json() as { error?: string; deleted?: boolean }
        if (!response.ok || !result.deleted) throw new Error(result.error || 'Не удалось удалить документ из Confluence.')
      }
      setDocuments((current) => current.filter((entry) => entry.id !== item.id))
      modal.current?.close()
      showToast(item.url ? 'Документ перемещён в корзину Confluence' : 'Документ удалён')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Не удалось удалить документ.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className={styles.page}>
      <h1>База знаний</h1>
      <Toast message={toast} />

      <section className={styles.addMaterial} aria-labelledby="add-material-heading">
        <h2 id="add-material-heading">Добавить материал</h2>
        <p className={styles.intro}>Загрузите документ с устройства</p>

        <div
          className={styles.upload}
          data-dragging={isDraggingFile}
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes('Files')) setIsDraggingFile(true)
          }}
          onDragOver={allowFileDrop}
          onDragLeave={(event) => {
            if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
              setIsDraggingFile(false)
            }
          }}
          onDrop={dropFile}
        >
          <div>
            <h3>{isDraggingFile ? 'Отпустите файл, чтобы добавить' : 'Перетащите файл сюда'}</h3>
            <p id="file-formats">PDF, DOCX или TXT</p>
          </div>
          <input ref={fileInput} type="file" accept=".pdf,.docx,.txt" onChange={uploadFile} hidden />
          <button type="button" className={styles.secondary} aria-describedby="file-formats" onClick={() => chooseFile()}>
            Выбрать файл
          </button>
        </div>

        <section className={styles.integrations} aria-labelledby="integrations-heading">
          <h3 id="integrations-heading">Интеграции</h3>
          <div className={styles.integration}>
            <div>
              <h4>Confluence</h4>
              <p role="status">{isSyncing ? 'Загрузка документов…' : confluenceError || (confluenceConnected ? 'Подключено локально' : 'Нет подключения')}</p>
            </div>
            <button className={styles.primary} type="button" disabled={isSyncing || isDeleting} onClick={() => {
              setIsSyncing(true)
              setSyncVersion((version) => version + 1)
            }}>
              {isSyncing ? 'Загрузка…' : confluenceError ? 'Повторить' : 'Обновить список'}
            </button>
          </div>
        </section>
      </section>

      <section className={styles.documentList} aria-labelledby="knowledge-documents">
        <header className={styles.documentHeading}>
          <h2 id="knowledge-documents">Документы в базе знаний</h2>
          <span>{documentCount(documents.length)}</span>
        </header>
        {documents.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>{isSyncing ? 'Загружаем документы' : 'Документов пока нет'}</h3>
            <p>{isSyncing ? 'Получаем список из Confluence.' : 'Загрузите документ с устройства или обновите список Confluence.'}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-labelledby="knowledge-documents">
              <colgroup><col /><col /><col /><col /></colgroup>
              <thead>
                <tr>
                  <th scope="col">Документ</th>
                  <th scope="col">Дата добавления / изменения</th>
                  <th scope="col">Статус</th>
                  <th scope="col"><span className={styles.visuallyHidden}>Действия</span></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.name}<small>{item.description}</small></th>
                    <td>{dateFormat.format(item.date)}</td>
                    <td>Добавлен</td>
                    <td className={styles.actions}>
                      <details
                        className={styles.menu}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape' && event.currentTarget.open) {
                            event.currentTarget.querySelector('summary')?.focus()
                            event.currentTarget.open = false
                          }
                        }}
                      >
                        <summary className={styles.iconButton} aria-label={'Действия: ' + item.name}>···</summary>
                        <div className={styles.menuPanel}>
                          <button type="button" onClick={(event) => {
                            closeMenu(event)
                            openDocument(item)
                          }}>Открыть документ</button>
                          {!item.url && <button type="button" onClick={(event) => {
                            closeMenu(event)
                            chooseFile(item)
                          }}>Заменить документ</button>}
                          <button type="button" onClick={(event) => {
                            closeMenu(event)
                            setDeleteError('')
                            setDocumentToDelete(item)
                          }} disabled={isSyncing || isDeleting}>Удалить документ</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <dialog ref={modal} className={styles.dialog} onCancel={(event) => { if (isDeleting) event.preventDefault() }} onClose={() => setDocumentToDelete(null)} aria-labelledby="document-dialog-title">
        {documentToDelete && (
          <>
            <h2 id="document-dialog-title">{documentToDelete.url ? 'Удалить из Confluence?' : 'Удалить документ?'}</h2>
            <p>{documentToDelete.name}</p>
            {documentToDelete.url && <p>{documentToDelete.confluenceType === 'attachment' ? 'Вложение' : 'Страница'} будет перемещено в корзину Confluence. Удаление затронет всех пользователей с доступом к этому материалу.</p>}
            {deleteError && <p role="alert" className={styles.deleteError}>{deleteError}</p>}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondary} disabled={isDeleting} onClick={() => modal.current?.close()}>Отмена</button>
              <button type="button" className={styles.danger} disabled={isDeleting} onClick={() => void deleteDocument(documentToDelete)}>{isDeleting ? 'Удаление…' : 'Удалить'}</button>
            </div>
          </>
        )}
      </dialog>
    </main>
  )
}
