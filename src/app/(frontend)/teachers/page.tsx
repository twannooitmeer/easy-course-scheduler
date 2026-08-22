import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import config from '@/payload.config'
import { PAGE_SIZE, parsePageParam } from '../paginationConfig'
import { TeachersList } from './TeachersList'

export const dynamic = 'force-dynamic'

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fteachers')
  }

  const { page: pageParam, q } = await searchParams
  const page = parsePageParam(pageParam)
  const query = q?.trim() ?? ''

  const where: Where = query
    ? {
        or: [
          { displayName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      }
    : {}

  const teachers = await payload.find({
    collection: 'teachers',
    depth: 0,
    sort: 'displayName',
    where,
    page,
    limit: PAGE_SIZE,
  })

  return (
    <TeachersList
      teachers={teachers.docs}
      query={query}
      page={teachers.page ?? 1}
      totalPages={teachers.totalPages ?? 1}
      totalDocs={teachers.totalDocs}
    />
  )
}
