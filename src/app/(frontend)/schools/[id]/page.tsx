import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { SchoolDetail } from '../SchoolDetail'

export const dynamic = 'force-dynamic'

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const schoolId = Number(id)

  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect(`/admin/login?redirect=%2Fschools%2F${schoolId}`)
  }

  if (!Number.isFinite(schoolId)) {
    notFound()
  }

  const school = await payload.findByID({ collection: 'schools', id: schoolId, depth: 0 }).catch(() => null)
  if (!school) {
    notFound()
  }

  const [contactsResult, bookingsResult] = await Promise.all([
    payload.find({
      collection: 'contacts',
      depth: 0,
      where: { school: { equals: schoolId } },
      sort: 'fullName',
      limit: 500,
    }),
    payload.find({
      collection: 'bookings',
      depth: 1,
      where: { school: { equals: schoolId } },
      sort: '-startDate',
      limit: 500,
    }),
  ])

  const bookings = bookingsResult.docs.map((booking) => ({
    id: Number(booking.id),
    schoolName: school.name,
    programName: typeof booking.program === 'object' ? booking.program.name : String(booking.program),
    groupLabel: booking.groupLabel,
    startDate: booking.startDate,
    status: booking.status,
  }))

  return <SchoolDetail school={school} contacts={contactsResult.docs} bookings={bookings} />
}
