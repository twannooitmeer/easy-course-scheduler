import type { CollectionAfterChangeHook } from 'payload'

import { relationshipId } from '../utils/relationshipId'
import { getNotificationSender } from './index'
import { buildBookingStatusChangeEmail, buildLessonStatusChangeEmail } from './templates'

/**
 * Both hooks below share the same shape: only react to a real status change
 * on `update` (never on `create` — a freshly created row has no "previous"
 * status to have changed from, and this is also what keeps the legacy
 * import script's row-by-row `create` calls silent by construction, with no
 * extra flag needed for that half of it), resolve recipients, build the
 * email through the shared i18n templates, and send it through whichever
 * transport `getNotificationSender()` currently resolves to. A send
 * failure is logged, never thrown — a Resend outage must not block the
 * status update that triggered it.
 *
 * `req.context?.skipNotification` mirrors the existing
 * `skipLessonGeneration` convention (see generateLessonsFromBooking.ts):
 * the legacy import script sets it on the `update` calls it makes while
 * reconciling an already-imported row against a later export of the same
 * spreadsheet, so re-running an import against hundreds of changed rows
 * doesn't fan out into hundreds of emails.
 */

export const notifyOnBookingStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc
  if (req.context?.skipNotification) return doc
  if (!previousDoc || previousDoc.status === doc.status) return doc

  try {
    const [school, program, contacts] = await Promise.all([
      req.payload.findByID({ collection: 'schools', id: relationshipId(doc.school), depth: 0, req }),
      req.payload.findByID({ collection: 'programs', id: relationshipId(doc.program), depth: 0, req }),
      req.payload.find({
        collection: 'contacts',
        where: { school: { equals: relationshipId(doc.school) } },
        depth: 0,
        limit: 100,
        req,
      }),
    ])

    const recipients = contacts.docs.map((contact) => contact.email).filter((email): email is string => Boolean(email))

    if (recipients.length === 0) {
      req.payload.logger.info(
        `Booking ${doc.id}: status changed to "${doc.status}", but the school has no contact with an email to notify.`,
      )
      return doc
    }

    const email = buildBookingStatusChangeEmail({
      schoolName: school.name,
      programName: program.name,
      groupLabel: doc.groupLabel,
      status: doc.status,
    })

    await getNotificationSender(req.payload.logger).send({ to: recipients, ...email })
  } catch (err) {
    req.payload.logger.error(`Booking ${doc.id}: failed to send status-change notification — ${String(err)}`)
  }

  return doc
}

export const notifyOnLessonStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc
  if (req.context?.skipNotification) return doc
  if (!previousDoc || previousDoc.status === doc.status) return doc

  try {
    const teacherIds = Array.isArray(doc.teachers) ? doc.teachers.map(relationshipId) : []

    if (teacherIds.length === 0) {
      req.payload.logger.info(`Lesson ${doc.id}: status changed to "${doc.status}", but no teacher is assigned to notify.`)
      return doc
    }

    const booking = await req.payload.findByID({ collection: 'bookings', id: relationshipId(doc.booking), depth: 0, req })

    const [school, program, teachers] = await Promise.all([
      req.payload.findByID({ collection: 'schools', id: relationshipId(booking.school), depth: 0, req }),
      req.payload.findByID({ collection: 'programs', id: relationshipId(booking.program), depth: 0, req }),
      req.payload.find({
        collection: 'teachers',
        where: { id: { in: teacherIds } },
        depth: 0,
        limit: teacherIds.length,
        req,
      }),
    ])

    const recipients = teachers.docs.map((teacher) => teacher.email).filter((email): email is string => Boolean(email))

    if (recipients.length === 0) {
      req.payload.logger.info(`Lesson ${doc.id}: status changed to "${doc.status}", but no assigned teacher has an email to notify.`)
      return doc
    }

    const email = buildLessonStatusChangeEmail({
      schoolName: school.name,
      programName: program.name,
      sequenceNo: doc.sequenceNo,
      lessonDate: doc.lessonDate,
      status: doc.status,
    })

    await getNotificationSender(req.payload.logger).send({ to: recipients, ...email })
  } catch (err) {
    req.payload.logger.error(`Lesson ${doc.id}: failed to send status-change notification — ${String(err)}`)
  }

  return doc
}
