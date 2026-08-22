'use client'

import { useLocale } from './i18n/LocaleProvider'

export function Pagination({
  page,
  totalPages,
  totalDocs,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalDocs: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const { t } = useLocale()

  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalDocs)

  return (
    <div className="pagination">
      <span className="pagination-range">{t('common.showingRange', { from, to, total: totalDocs })}</span>
      <div className="pagination-controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {t('common.previous')}
        </button>
        <span className="pagination-page">{t('common.pageOf', { page, totalPages })}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          {t('common.next')}
        </button>
      </div>
    </div>
  )
}
