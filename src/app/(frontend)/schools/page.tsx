import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import config from '@/payload.config'
import { PAGE_SIZE, parsePageParam } from '../paginationConfig'
import { SchoolsList } from './SchoolsList'

export const dynamic = 'force-dynamic'

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fschools')
  }

  const { page: pageParam, q } = await searchParams
  const page = parsePageParam(pageParam)
  const query = q?.trim() ?? ''

  const where: Where = query
    ? {
        or: [
          { name: { contains: query } },
          { city: { contains: query } },
          { phone: { contains: query } },
        ],
      }
    : {}

  const schoolsResult = await payload.find({
    collection: 'schools',
    depth: 0,
    sort: 'name',
    where,
    page,
    limit: PAGE_SIZE,
  })

  const schoolIds = schoolsResult.docs.map((school) => Number(school.id))
  const contactsResult =
    schoolIds.length > 0
      ? await payload.find({
          collection: 'contacts',
          depth: 0,
          where: { school: { in: schoolIds } },
          limit: 5000,
        })
      : { docs: [] }

  const contactCountBySchool = new Map<number, number>()
  for (const contact of contactsResult.docs) {
    const schoolId = typeof contact.school === 'object' ? contact.school.id : contact.school
    contactCountBySchool.set(schoolId, (contactCountBySchool.get(schoolId) ?? 0) + 1)
  }

  const schools = schoolsResult.docs.map((school) => ({
    ...school,
    contactCount: contactCountBySchool.get(Number(school.id)) ?? 0,
  }))

  return (
    <SchoolsList
      schools={schools}
      query={query}
      page={schoolsResult.page ?? 1}
      totalPages={schoolsResult.totalPages ?? 1}
      totalDocs={schoolsResult.totalDocs}
    />
  )
}
