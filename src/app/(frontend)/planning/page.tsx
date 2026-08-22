import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { groupLessonsByBooking } from './groupLessons'
import { NewBookingDialog } from './NewBookingDialog'
import { PlanningGrid } from './PlanningGrid'

export const dynamic = 'force-dynamic'

export default async function PlanningPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fplanning')
  }

  const [bookingsResult, lessonsResult, teachersResult, schoolsResult, programsResult] = await Promise.all([
    payload.find({
      collection: 'bookings',
      depth: 1,
      sort: 'startDate',
      limit: 500,
    }),
    payload.find({
      collection: 'lessons',
      depth: 1,
      sort: 'sequenceNo',
      limit: 5000,
    }),
    payload.find({
      collection: 'teachers',
      depth: 0,
      sort: 'displayName',
      limit: 500,
      where: { active: { equals: true } },
    }),
    payload.find({
      collection: 'schools',
      depth: 0,
      sort: 'name',
      limit: 500,
    }),
    payload.find({
      collection: 'programs',
      depth: 0,
      sort: 'name',
      limit: 500,
      where: { active: { equals: true } },
    }),
  ])

  const bookings = groupLessonsByBooking(bookingsResult.docs, lessonsResult.docs)

  const teacherOptions = teachersResult.docs.map((teacher) => ({
    id: Number(teacher.id),
    displayName: teacher.displayName,
  }))
  const schoolOptions = schoolsResult.docs.map((school) => ({ id: Number(school.id), name: school.name }))
  const programOptions = programsResult.docs.map((program) => ({
    id: Number(program.id),
    name: program.name,
  }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Planning</h1>
          <p className="subtitle">
            Signed in as {user.name} ({user.email})
          </p>
        </div>
        <NewBookingDialog schoolOptions={schoolOptions} programOptions={programOptions} />
      </div>
      <PlanningGrid bookings={bookings} teacherOptions={teacherOptions} />
    </div>
  )
}
