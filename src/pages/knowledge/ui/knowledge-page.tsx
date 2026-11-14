import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent as ReactDragEvent, MouseEvent } from 'react'
import { Toast, useToast } from '@/shared/ui/toast'
import { documentFromFile, loadDocuments, loadJob, removeDocument, replaceDocument, uploadDocument } from '../model/documents'
import type { KnowledgeDocument } from '../model/documents'
import styles from './knowledge-page.module.css'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' })
const plurals = new Intl.PluralRules('ru-RU')
const documentNouns: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'документ',
  few: 'документа',
  many: 'документов',
}
const statusLabels = {
  queued: 'В очереди',
  running: 'Обрабатывается',
  succeeded: 'Готово',
  failed: 'Ошибка обработки',
  unavailable: 'Не удалось проверить статус',
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
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)
  const [documentsError, setDocumentsError] = useState('')
  const [documentsVersion, setDocumentsVersion] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const replacementInput = useRef<HTMLInputElement>(null)
  const replacementTarget = useRef<KnowledgeDocument | null>(null)
  const mutationInProgress = useRef(false)
  const pendingJobs = useRef(new Set<string>())
  const modal = useRef<HTMLDialogElement>(null)

  const activeJobIds = documents.filter((item) => item.status !== 'succeeded' && item.status !== 'failed').map((item) => item.jobId).join(',')

  useEffect(() => {
    const controller = new AbortController()
    loadDocuments(controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return
        const loadedIds = new Set(loaded.map((item) => item.jobId))
        const pendingIds = new Set(pendingJobs.current)
        setDocuments((current) => {
          const pending = current.filter((item) => pendingIds.has(item.jobId) && !loadedIds.has(item.jobId))
          const pendingSources = new Set(pending.map((item) => item.sourceId).filter(Boolean))
          const serverDocuments = loaded.filter((item) => !item.sourceId || !pendingSources.has(item.sourceId)).map((item) => ({ ...item, file: current.find((entry) => entry.jobId === item.jobId)?.file }))
          return [...pending, ...serverDocuments]
        })
        loadedIds.forEach((id) => pendingJobs.current.delete(id))
        setDocumentsError('')
        setIsLoadingDocuments(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDocumentsError('Не удалось загрузить список документов.')
          setIsLoadingDocuments(false)
        }
      })
    return () => controller.abort()
  }, [documentsVersion])

  useEffect(() => {
    if (!activeJobIds) return
    const controller = new AbortController()
    let checking = false
    async function checkJobs() {
      if (checking) return
      checking = true
      await Promise.all(activeJobIds.split(',').map(async (jobId) => {
        try {
          const job = await loadJob(jobId, controller.signal)
          if (!controller.signal.aborted) {
            setDocuments((current) => current.map((item) => item.jobId === jobId && item.status !== job.status ? { ...item, status: job.status } : item))
            if (job.status === 'succeeded' || job.status === 'failed') setDocumentsVersion((value) => value + 1)
          }
        } catch {
          if (!controller.signal.aborted) setDocuments((current) => current.map((item) => item.jobId === jobId && item.status !== 'unavailable' ? { ...item, status: 'unavailable' } : item))
        }
      }))
      checking = false
    }
    void checkJobs()
    const timer = window.setInterval(() => void checkJobs(), 5000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [activeJobIds])

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

  function chooseFile() {
    fileInput.current?.click()
  }

  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) void addFile(file)
  }

  function chooseReplacement(item: KnowledgeDocument) {
    replacementTarget.current = item
    replacementInput.current?.click()
  }

  function uploadReplacement(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    const previous = replacementTarget.current
    event.currentTarget.value = ''
    replacementTarget.current = null
    if (file && previous) void addFile(file, previous)
  }

  async function addFile(file: File, previous?: KnowledgeDocument) {
    if (mutationInProgress.current) return
    try {
      const document = documentFromFile(file)
      mutationInProgress.current = true
      setIsUploading(true)
      const job = previous ? await replaceDocument(previous.jobId, file) : await uploadDocument(file)
      if (previous) pendingJobs.current.delete(previous.jobId)
      pendingJobs.current.add(job.job_id)
      setDocuments((current) => [
        { ...document, id: job.job_id, jobId: job.job_id, sourceId: job.source_id, status: 'queued' },
        ...current.filter((item) => !previous || (item.id !== previous.id && (!previous.sourceId || item.sourceId !== previous.sourceId))),
      ])
      setDocumentsVersion((value) => value + 1)
      showToast(previous ? 'Новый файл отправлен на обработку' : 'Файл отправлен на обработку')
    } catch (error) {
      showToast(error instanceof Error && error.message === 'Выберите непустой файл PDF, DOCX или TXT.' ? error.message : previous ? 'Не удалось заменить документ. Попробуйте ещё раз.' : 'Не удалось загрузить файл. Попробуйте ещё раз.', 'error')
    } finally {
      mutationInProgress.current = false
      setIsUploading(false)
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

    void addFile(files[0])
  }

  function closeMenu(event: MouseEvent<HTMLElement>) {
    const details = event.currentTarget.closest('details')
    if (details) {
      details.querySelector('summary')?.focus()
      details.open = false
    }
  }

  function openDocument(item: KnowledgeDocument) {
    if (item.documentUrl) {
      window.open(item.documentUrl, '_blank', 'noopener,noreferrer')
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
    if (mutationInProgress.current) return
    mutationInProgress.current = true
    setIsDeleting(true)
    setDeleteError('')
    try {
      await removeDocument(item.jobId)
      pendingJobs.current.delete(item.jobId)
      setDocuments((current) => current.filter((entry) => entry.id !== item.id && (!item.sourceId || entry.sourceId !== item.sourceId)))
      setDocumentsVersion((value) => value + 1)
      modal.current?.close()
      showToast('Документ удалён')
    } catch {
      setDeleteError('Не удалось удалить документ. Попробуйте ещё раз.')
    } finally {
      mutationInProgress.current = false
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
          <input ref={replacementInput} type="file" accept=".pdf,.docx,.txt" onChange={uploadReplacement} hidden />
          <button type="button" className={styles.secondary} aria-describedby="file-formats" disabled={isUploading || isDeleting} onClick={chooseFile}>
            {isUploading ? 'Загрузка…' : 'Выбрать файл'}
          </button>
        </div>
      </section>

      <section className={styles.documentList} aria-labelledby="knowledge-documents">
        <header className={styles.documentHeading}>
          <h2 id="knowledge-documents">Документы в базе знаний</h2>
          <span>{documentCount(documents.length)}</span>
        </header>
        {documentsError && !isLoadingDocuments && <div role="alert" className={styles.documentsError}><span>{documentsError}</span><button type="button" className={styles.secondary} onClick={() => { setIsLoadingDocuments(true); setDocumentsVersion((value) => value + 1) }}>Повторить</button></div>}
        {documents.length === 0 && isLoadingDocuments ? (
          <div className={styles.emptyState}><h3>Загружаем документы</h3></div>
        ) : documents.length === 0 && !documentsError ? (
          <div className={styles.emptyState}>
            <h3>Документов пока нет</h3>
            <p>Загрузите документ с устройства.</p>
          </div>
        ) : documents.length > 0 ? (
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
                    <td className={item.status === 'failed' || item.status === 'unavailable' ? styles.statusError : undefined} aria-live="polite">{item.status ? statusLabels[item.status] : 'Добавлен'}</td>
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
                          }} disabled={!item.documentUrl && !item.file}>Открыть документ</button>
                          <button type="button" onClick={(event) => {
                            closeMenu(event)
                            chooseReplacement(item)
                          }} disabled={isUploading || isDeleting}>Заменить документ</button>
                          <button type="button" onClick={(event) => {
                            closeMenu(event)
                            setDeleteError('')
                            setDocumentToDelete(item)
                          }} disabled={isUploading || isDeleting}>Удалить документ</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <dialog ref={modal} className={styles.dialog} onCancel={(event) => { if (isDeleting) event.preventDefault() }} onClose={() => setDocumentToDelete(null)} aria-labelledby="document-dialog-title">
        {documentToDelete && (
          <>
            <h2 id="document-dialog-title">Удалить документ?</h2>
            <p>{documentToDelete.name}</p>
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
