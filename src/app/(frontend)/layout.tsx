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

// Without this, `next build` still tries a build-time render pass for
// every route to detect which ones need dynamic APIs — and since this
// layout now calls the Payload Local API (auth + the site-settings
// global) on every request, that pass fails outright with "missing
// secret key" (PAYLOAD_SECRET is a runtime-only env var, never a build
// arg). Every page under (frontend) already opts into this individually;
// setting it here on the shared layout makes it the default for the
// whole segment instead of something each new page has to remember.
export const dynamic = 'force-dynamic'

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

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>
          <div className="app-shell">
            <AppNav orgName={orgName} logoUrl={logoUrl} />
            <div className="app-content">{children}</div>
          </div>
        </LocaleProvider>
      </body>
    </html>
  )
}
