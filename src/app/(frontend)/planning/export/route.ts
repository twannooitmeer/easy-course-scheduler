import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'

import type { Payload } from 'payload'

import { DEFAULT_LOCALE, isLocale, type Locale } from '../../i18n/locale'
import { t } from '../../i18n/t'
import { requireUser } from '../../requireUser'
import { filterBookings, filtersFromSearchParams, type PlanningFilters } from '../filters'
import { statusLabel } from '../format'
import { groupLessonsByBooking } from '../groupLessons'
import { buildPlanningPdfHtml } from '../pdfExport'

/**
 * Resolves each active filter to a human-readable label for the PDF's own
 * header, by ID rather than by scanning the already-filtered bookings --
 * a filter can be valid (a real school/teacher) even if it happens to match
 * zero bookings, and the summary should still name it correctly.
 */
async function describeFilters(payload: Payload, filters: PlanningFilters, locale: Locale): Promise<string> {
  const parts: string[] = []

  if (filters.school !== undefined) {
    const school = await payload.findByID({ collection: 'schools', id: filters.school, depth: 0 }).catch(() => null)
    if (school) parts.push(`${t(locale, 'planning.filterSchool')}: ${school.name}`)
  }
  if (filters.program !== undefined) {
    const program = await payload
      .findByID({ collection: 'programs', id: filters.program, depth: 0 })
      .catch(() => null)
    if (program) parts.push(`${t(locale, 'planning.filterProgram')}: ${program.name}`)
  }
  if (filters.teacher !== undefined) {
    const teacher = await payload
      .findByID({ collection: 'teachers', id: filters.teacher, depth: 0 })
      .catch(() => null)
    if (teacher) parts.push(`${t(locale, 'planning.filterTeacher')}: ${teacher.displayName}`)
  }
  if (filters.status !== undefined) {
    parts.push(`${t(locale, 'planning.filterStatus')}: ${statusLabel(filters.status)}`)
  }
  if (filters.group) {
    parts.push(`${t(locale, 'planning.filterGroup')}: ${filters.group}`)
  }
  if (filters.month) {
    parts.push(`${t(locale, 'planning.filterMonth')}: ${filters.month}`)
  }

  return parts.join(' · ')
}

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

export async function GET(request: Request) {
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
  const allBookings = groupLessonsByBooking(bookingsResult.docs, lessonsResult.docs)
  const filters = filtersFromSearchParams(new URL(request.url).searchParams)
  const bookings = filterBookings(allBookings, filters)
  const filterSummary = await describeFilters(payload, filters, locale)
  const html = buildPlanningPdfHtml(bookings, locale, new Date(), filterSummary || undefined)

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
