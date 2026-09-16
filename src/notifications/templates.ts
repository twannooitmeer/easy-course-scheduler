import { DEFAULT_LOCALE, type Locale } from '@/app/(frontend)/i18n/locale'
import { t } from '@/app/(frontend)/i18n/t'
import { statusLabel } from '@/app/(frontend)/planning/format'
import type { Booking, Lesson } from '@/payload-types'

/**
 * Notification copy is built through the same `t()`/dictionary system the
 * rest of the front-end uses (`src/app/(frontend)/i18n/`) — see the
 * `notifications` dictionary keys. Status values themselves go through
 * `statusLabel()` rather than the dictionary, matching every other place
 * in the app: they're the deployment's own Dutch workflow vocabulary, not
 * English terms needing translation (see the comment on Bookings.ts).
 *
 * There is no per-recipient locale yet (Contacts/Teachers don't carry a
 * language preference, unlike Users) — every notification renders in
 * `DEFAULT_LOCALE` unless a caller passes one explicitly.
 */

export type BookingEmailContent = { subject: string; text: string }

export function buildBookingStatusChangeEmail(params: {
  locale?: Locale
  schoolName: string
  programName: string
  groupLabel?: string | null
  status: Booking['status']
}): BookingEmailContent {
  const locale = params.locale ?? DEFAULT_LOCALE
  const status = statusLabel(params.status)
  const group = params.groupLabel ? ` — ${params.groupLabel}` : ''

  return {
    subject: t(locale, 'notifications.bookingStatusChangedSubject', {
      school: params.schoolName,
      program: params.programName,
      status,
    }),
    text: t(locale, 'notifications.bookingStatusChangedBody', {
      school: params.schoolName,
      program: params.programName,
      group,
      status,
    }),
  }
}

export function buildLessonStatusChangeEmail(params: {
  locale?: Locale
  schoolName: string
  programName: string
  sequenceNo: number
  lessonDate: string
  status: Lesson['status']
}): BookingEmailContent {
  const locale = params.locale ?? DEFAULT_LOCALE
  const status = statusLabel(params.status)
  const date = new Date(params.lessonDate).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB')

  return {
    subject: t(locale, 'notifications.lessonStatusChangedSubject', {
      school: params.schoolName,
      program: params.programName,
      seq: params.sequenceNo,
      status,
    }),
    text: t(locale, 'notifications.lessonStatusChangedBody', {
      school: params.schoolName,
      program: params.programName,
      seq: params.sequenceNo,
      date,
      status,
    }),
  }
}
