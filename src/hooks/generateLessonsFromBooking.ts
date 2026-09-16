import type { CollectionAfterChangeHook } from 'payload'

import { relationshipId } from '../utils/relationshipId'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_WEEKLY_CADENCE_DAYS = 7

/**
 * Booking a School onto a Program should auto-populate the schedule, then
 * let staff hand-edit it — that's the core workflow this app replaces Excel
 * for. On create, this reads every LessonTemplate for the booking's program
 * (in sequence order) and stamps out one real Lesson per template, spaced a
 * week apart starting from the booking's start date. Staff adjust individual
 * dates, times, and teachers afterward; nothing here re-runs on update, so
 * hand edits are never overwritten by a second save of the booking.
 */
export const generateLessonsFromBooking: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create') return doc

  // The legacy-spreadsheet migration script inserts real historical lessons directly
  // and sets this flag so a booking created from old data doesn't also get a
  // second, template-generated set of lessons alongside them.
  if (req.context?.skipLessonGeneration) return doc

  const programId = relationshipId(doc.program)

  const templates = await req.payload.find({
    collection: 'lesson-templates',
    where: { program: { equals: programId } },
    sort: 'sequenceNo',
    limit: 500,
    depth: 0,
    req,
  })

  if (templates.totalDocs === 0) {
    req.payload.logger.warn(
      `Booking ${doc.id}: program ${programId} has no lesson templates, no lessons generated.`,
    )
    return doc
  }

  const startDate = new Date(doc.startDate)

  for (const template of templates.docs) {
    const offsetDays = (template.sequenceNo - 1) * DEFAULT_WEEKLY_CADENCE_DAYS
    const lessonDate = new Date(startDate.getTime() + offsetDays * DAY_MS)
    const defaultTeacherId = template.defaultTeacher ? relationshipId(template.defaultTeacher) : null

    await req.payload.create({
      collection: 'lessons',
      data: {
        booking: doc.id,
        sequenceNo: template.sequenceNo,
        lessonDate: lessonDate.toISOString(),
        groupLabel: doc.groupLabel,
        teachers: defaultTeacherId ? [defaultTeacherId] : [],
        status: 'nieuw',
      },
      req,
    })
  }

  return doc
}
