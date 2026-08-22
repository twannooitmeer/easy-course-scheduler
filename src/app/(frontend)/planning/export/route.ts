import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

import { DEFAULT_LOCALE, isLocale } from '../../i18n/locale'
import { requireUser } from '../../requireUser'
import { groupLessonsByBooking } from '../groupLessons'
import { buildPlanningPdfHtml } from '../pdfExport'

export const dynamic = 'force-dynamic'

/**
 * Runs against the system Chromium the Dockerfile installs via apk, not
 * puppeteer's own bundled download -- Alpine's musl libc can't run the
 * glibc binary `puppeteer` (as opposed to `puppeteer-core`) would otherwise
 * fetch. PUPPETEER_EXECUTABLE_PATH is unset in local dev on most machines;
 * puppeteer-core requires it explicitly, so fall back to a typical local
 * Chrome/Chromium install path rather than forcing every contributor to
 * set an env var just to try this route.
 */
const EXECUTABLE_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function GET() {
  const auth = await requireUser().catch(() => null)
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { payload, user } = auth

  const [bookingsResult, lessonsResult] = await Promise.all([
    payload.find({ collection: 'bookings', depth: 1, sort: 'startDate', limit: 500 }),
    payload.find({ collection: 'lessons', depth: 1, sort: 'sequenceNo', limit: 5000 }),
  ])

  const locale = isLocale(user.preferredLanguage) ? user.preferredLanguage : DEFAULT_LOCALE
  const bookings = groupLessonsByBooking(bookingsResult.docs, lessonsResult.docs)
  const html = buildPlanningPdfHtml(bookings, locale, new Date())

  const browser = await puppeteer.launch({
    executablePath: EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true })

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planning-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    })
  } finally {
    await browser.close()
  }
}
