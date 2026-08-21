import type { CollectionAfterChangeHook } from 'payload'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_WEEKLY_CADENCE_DAYS = 7

/**
 * A relationship field's value on `doc` is the raw ID only when the
 * triggering request used `depth: 0`. The local API defaults to depth 2, so
 * `doc.program` is just as likely to arrive already populated as
 * `{ id, name, ... }` — passing that whole object into a `where.equals`
 * clause is what produced a real "invalid input syntax for type integer:
 * NaN" Postgres error the first time this hook was tested against a real DB.
 */
function relationshipId(value: unknown): number {
  if (value && typeof value === 'object' && 'id' in value) {
    return Number((value as { id: number | string }).id)
  }
  return Number(value)
}

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
