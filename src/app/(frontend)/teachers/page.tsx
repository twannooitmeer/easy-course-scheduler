import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { TeachersList } from './TeachersList'

export const dynamic = 'force-dynamic'

export default async function TeachersPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fteachers')
  }

  const teachers = await payload.find({
    collection: 'teachers',
    depth: 0,
    sort: 'displayName',
    limit: 500,
  })

  return <TeachersList teachers={teachers.docs} />
}
