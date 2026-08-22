'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSyncExternalStore, useTransition } from 'react'

import { useLocale } from './i18n/LocaleProvider'
import type { TranslationKey } from './i18n/t'

const NAV_ITEMS: { href: string; labelKey: TranslationKey; short: string }[] = [
  { href: '/planning', labelKey: 'nav.planning', short: 'Pl' },
  { href: '/schools', labelKey: 'nav.schools', short: 'Sc' },
  { href: '/teachers', labelKey: 'nav.teachers', short: 'Te' },
  { href: '/programs', labelKey: 'nav.programs', short: 'Pr' },
]

const STORAGE_KEY = 'app-nav-collapsed'

const collapsedListeners = new Set<() => void>()

function subscribeCollapsed(onChange: () => void) {
  collapsedListeners.add(onChange)
  return () => collapsedListeners.delete(onChange)
}

function getCollapsedSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

// The server has no localStorage, so it always renders expanded; the real
// value is read via useSyncExternalStore's client snapshot right after
// hydration — the standard way to read a synchronous external store like
// localStorage without a setState-in-effect render cascade.
function getCollapsedServerSnapshot() {
  return false
}

function setCollapsedStore(next: boolean) {
  localStorage.setItem(STORAGE_KEY, String(next))
  collapsedListeners.forEach((listener) => listener())
}

export function AppNav({
  orgName,
  logoUrl,
  isAdmin,
}: {
  orgName?: string
  logoUrl?: string
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot)
  const [isLoggingOut, startLogout] = useTransition()

  function toggle() {
    setCollapsedStore(!collapsed)
  }

  function handleLogout() {
    startLogout(async () => {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
      router.push('/admin/login')
      router.refresh()
    })
  }

  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/')

  return (
    <nav className={`app-nav ${collapsed ? 'collapsed' : ''}`}>
      <div className="app-nav-header">
        <button
          type="button"
          className="app-nav-toggle"
          onClick={toggle}
          aria-label={collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
          title={collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
        >
          ☰
        </button>
        {!collapsed && (
          <div className="app-nav-title">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- external/uploaded logo, not a static asset next/image can optimize reliably across deployments
              <img src={logoUrl} alt="" className="app-nav-logo" />
            )}
            {orgName || t('nav.defaultOrgName')}
          </div>
        )}
      </div>
      <ul>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const label = t(item.labelKey)
          return (
            <li key={item.href}>
              <Link href={item.href} className={active ? 'active' : ''} title={label}>
                {collapsed ? item.short : label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="app-nav-footer">
        {isAdmin && !collapsed && (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- /admin is Payload's own mounted app, not a Next.js page; a real navigation is correct here
          <a href="/admin/globals/site-settings" className="app-nav-admin-link" title={t('settings.organisationSettingsLink')}>
            {t('settings.organisationSettingsLink')}
          </a>
        )}
        <div className="app-nav-footer-row">
          <Link href="/settings" className={`app-nav-icon-link ${settingsActive ? 'active' : ''}`} title={t('nav.settings')}>
            ⚙{!collapsed && <span>{t('nav.settings')}</span>}
          </Link>
          <button type="button" className="app-nav-icon-link" onClick={handleLogout} disabled={isLoggingOut} title={t('nav.logout')}>
            ⏻{!collapsed && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </div>
    </nav>
  )
}
