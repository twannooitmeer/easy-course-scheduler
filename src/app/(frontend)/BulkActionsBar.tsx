'use client'

import { useLocale } from './i18n/LocaleProvider'

export function BulkActionsBar({
  count,
  onRemove,
  isPending,
}: {
  count: number
  onRemove: () => void
  isPending: boolean
}) {
  const { t } = useLocale()

  if (count === 0) return null

  return (
    <div className="bulk-actions-bar">
      <span>{t('common.selectedCount', { count })}</span>
      <button type="button" className="danger" onClick={onRemove} disabled={isPending}>
        {t('common.removeSelected')}
      </button>
    </div>
  )
}
