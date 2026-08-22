import type { Metadata } from 'next'
import React from 'react'

import { AppNav } from './AppNav'
import './styles.css'

export const metadata: Metadata = {
  title: 'Easy Course Scheduler',
  description: 'Planning grid for schools, programs, and lessons.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <AppNav />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  )
}
