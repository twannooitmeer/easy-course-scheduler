'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import type { ImportResult } from './csvImport'
import { useLocale } from './i18n/LocaleProvider'

/**
 * One shared dialog for every master-data CSV import (Schools, Teachers,
 * Programs) -- the upload/parse/result-summary UI is identical across all
 * three; only the column set, template example, and the Server Action
 * differ, so those are the only parameters.
 */
export function ImportCsvDialog({
  entityLabel,
  templateColumns,
  templateExampleRow,
  onImport,
}: {
  entityLabel: string
  templateColumns: string[]
  templateExampleRow: string[]
  onImport: (csvText: string) => Promise<ImportResult>
}) {
  const { t } = useLocale()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function open() {
    setError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function downloadTemplate() {
    const csv = [templateColumns.join(','), templateExampleRow.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${entityLabel.toLowerCase()}-template.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError(t('csvImport.noFileSelected'))
      return
    }
    setError(null)

    startTransition(async () => {
      const csvText = await file.text()
      const importResult = await onImport(csvText)
      setResult(importResult)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" className="admin-link" onClick={open}>
        {t('csvImport.triggerButton')}
      </button>
      <dialog ref={dialogRef} className="new-booking-dialog">
        <form onSubmit={(e) => e.preventDefault()}>
          <h2>{t('csvImport.title', { entity: entityLabel })}</h2>
          <p className="dialog-subtitle">{t('csvImport.subtitle', { entity: entityLabel })}</p>

          <button type="button" className="admin-link" onClick={downloadTemplate}>
            {t('csvImport.downloadTemplate')}
          </button>

          <label className="csv-file-picker">
            {t('csvImport.chooseFile')}
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" />
          </label>

          {error && <p className="error-banner">{error}</p>}

          {result && (
            <div className="csv-import-result">
              <p>
                {result.errors.length > 0
                  ? t('csvImport.resultSummary', { created: result.created, errorCount: result.errors.length })
                  : t('csvImport.resultSummaryAllOk', { created: result.created })}
              </p>
              {result.errors.length > 0 && (
                <ul className="csv-import-errors">
                  {result.errors.map((rowError) => (
                    <li key={rowError.row}>
                      {t('csvImport.rowError', { row: rowError.row, error: rowError.error })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="dialog-actions">
            <button type="button" onClick={close} disabled={isPending}>
              {result ? t('common.done') : t('common.cancel')}
            </button>
            <button type="button" className="primary" onClick={handleImport} disabled={isPending}>
              {isPending ? t('csvImport.importing') : t('csvImport.importButton')}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
