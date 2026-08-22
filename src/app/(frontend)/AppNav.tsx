'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/planning', label: 'Planning' },
  { href: '/schools', label: 'Schools' },
  { href: '/teachers', label: 'Teachers' },
  { href: '/programs', label: 'Programs' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="app-nav">
      <div className="app-nav-title">Easy Course Scheduler</div>
      <ul>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <Link href={item.href} className={active ? 'active' : ''}>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
