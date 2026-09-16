import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { hasAdminRole } from '@/access/roles'
import { isLocale, DEFAULT_LOCALE } from '../i18n/locale'
import { SettingsForm } from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fsettings')
  }

  // Single source of truth for what "admin" means -- see access/roles.ts.
  const isAdmin = hasAdminRole(user)
  const currentLanguage = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE

  let orgName: string | undefined
  if (isAdmin) {
    const siteSettings = await payload.findGlobal({ slug: 'site-settings', depth: 0 }).catch(() => null)
    orgName = siteSettings?.organisationName || undefined
  }

  return <SettingsForm currentLanguage={currentLanguage} isAdmin={isAdmin} orgName={orgName} />
}
