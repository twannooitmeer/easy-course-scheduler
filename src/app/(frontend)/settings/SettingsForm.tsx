'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useLocale } from '../i18n/LocaleProvider'
import type { Locale } from '../i18n/locale'
import { updateOwnPreferredLanguage } from './actions'

export function SettingsForm({
  currentLanguage,
  isAdmin,
  orgName,
}: {
  currentLanguage: Locale
  isAdmin: boolean
  orgName?: string
}) {
  const { t } = useLocale()
  const router = useRouter()
  const [language, setLanguage] = useState<Locale>(currentLanguage)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale
    setLanguage(next)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updateOwnPreferredLanguage(next)
      if (result.success) {
        setSaved(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form className="record-form" onSubmit={(e) => e.preventDefault()}>
        <label>
          {t('settings.languageLabel')}
          <select value={language} onChange={handleChange} disabled={isPending}>
            <option value="en">{t('settings.englishOption')}</option>
            <option value="nl">{t('settings.dutchOption')}</option>
          </select>
        </label>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.78rem', gridColumn: '1 / -1', margin: 0 }}>
          {t('settings.languageHint')}
          {isPending && <span className="saving-dot" title={t('common.saving')} />}
          {saved && !isPending && <span className="saved-hint"> {t('common.saved')}</span>}
        </p>
      </form>

      {isAdmin && (
        <div className="sub-section">
          <div className="sub-section-header">
            <h2>{t('settings.organisationSectionHeading')}</h2>
          </div>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{t('settings.organisationSectionHint')}</p>
          <p style={{ fontSize: '0.9rem' }}>
            {orgName || t('nav.defaultOrgName')}
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /admin is Payload's own mounted app, not a Next.js page; a real navigation is correct here */}
          <a href="/admin/globals/site-settings" className="admin-link">
            {t('settings.organisationSettingsLink')}
          </a>
        </div>
      )}
    </div>
  )
}
