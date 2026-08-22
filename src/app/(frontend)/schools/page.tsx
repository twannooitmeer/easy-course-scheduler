import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { SchoolsList } from './SchoolsList'

export const dynamic = 'force-dynamic'

export default async function SchoolsPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fschools')
  }

  const [schoolsResult, contactsResult] = await Promise.all([
    payload.find({ collection: 'schools', depth: 0, sort: 'name', limit: 500 }),
    payload.find({ collection: 'contacts', depth: 0, limit: 5000 }),
  ])

  const contactCountBySchool = new Map<number, number>()
  for (const contact of contactsResult.docs) {
    const schoolId = typeof contact.school === 'object' ? contact.school.id : contact.school
    contactCountBySchool.set(schoolId, (contactCountBySchool.get(schoolId) ?? 0) + 1)
  }

  const schools = schoolsResult.docs.map((school) => ({
    ...school,
    contactCount: contactCountBySchool.get(Number(school.id)) ?? 0,
  }))

  return <SchoolsList schools={schools} />
}
