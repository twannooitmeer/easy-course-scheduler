import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { TeacherDetail } from '../TeacherDetail'

export const dynamic = 'force-dynamic'

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacherId = Number(id)

  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect(`/admin/login?redirect=%2Fteachers%2F${teacherId}`)
  }

  if (!Number.isFinite(teacherId)) {
    notFound()
  }

  const teacher = await payload.findByID({ collection: 'teachers', id: teacherId, depth: 0 }).catch(() => null)
  if (!teacher) {
    notFound()
  }

  // Bookings don't carry a teacher field directly — teacher assignment
  // happens per-lesson (Lessons.teachers, hasMany, for co-taught lessons).
  // "This teacher's bookings" means: bookings with at least one lesson
  // assigning them, found by joining through lessons.
  const lessonsForTeacher = await payload.find({
    collection: 'lessons',
    depth: 0,
    where: { teachers: { equals: teacherId } },
    limit: 5000,
  })
  const bookingIds = [
    ...new Set(lessonsForTeacher.docs.map((lesson) => (typeof lesson.booking === 'object' ? lesson.booking.id : lesson.booking))),
  ]

  const bookingsResult =
    bookingIds.length > 0
      ? await payload.find({
          collection: 'bookings',
          depth: 1,
          where: { id: { in: bookingIds } },
          sort: '-startDate',
          limit: 500,
        })
      : { docs: [] }

  const bookings = bookingsResult.docs.map((booking) => ({
    id: Number(booking.id),
    schoolName: typeof booking.school === 'object' ? booking.school.name : String(booking.school),
    programName: typeof booking.program === 'object' ? booking.program.name : String(booking.program),
    groupLabel: booking.groupLabel,
    startDate: booking.startDate,
    status: booking.status,
  }))

  return <TeacherDetail teacher={teacher} bookings={bookings} />
}
