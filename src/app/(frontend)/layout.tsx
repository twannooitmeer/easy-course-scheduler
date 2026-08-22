import { headers as getHeaders } from 'next/headers'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { AppNav } from './AppNav'
import { isLocale, DEFAULT_LOCALE } from './i18n/locale'
import { LocaleProvider } from './i18n/LocaleProvider'
import './styles.css'

export const metadata: Metadata = {
  title: 'Easy Course Scheduler',
  description: 'Planning grid for schools, programs, and lessons.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const [{ user }, siteSettings] = await Promise.all([
    payload.auth({ headers: headersList }),
    payload.findGlobal({ slug: 'site-settings', depth: 1 }).catch(() => null),
  ])

  const locale = isLocale(user?.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE
  const orgName = siteSettings?.organisationName || undefined
  const logoUrl = siteSettings?.logo && typeof siteSettings.logo === 'object' ? siteSettings.logo.url ?? undefined : undefined
  const isAdmin = user?.role === 'admin'

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>
          <div className="app-shell">
            <AppNav orgName={orgName} logoUrl={logoUrl} isAdmin={isAdmin} />
            <div className="app-content">{children}</div>
          </div>
        </LocaleProvider>
      </body>
    </html>
  )
}
