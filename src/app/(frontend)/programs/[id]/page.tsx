import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ProgramDetail } from '../ProgramDetail'

export const dynamic = 'force-dynamic'

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const programId = Number(id)

  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect(`/admin/login?redirect=%2Fprograms%2F${programId}`)
  }

  if (!Number.isFinite(programId)) {
    notFound()
  }

  const program = await payload.findByID({ collection: 'programs', id: programId, depth: 0 }).catch(() => null)
  if (!program) {
    notFound()
  }

  const [templatesResult, teachersResult] = await Promise.all([
    payload.find({
      collection: 'lesson-templates',
      depth: 1,
      where: { program: { equals: programId } },
      sort: 'sequenceNo',
      limit: 500,
    }),
    payload.find({ collection: 'teachers', depth: 0, sort: 'displayName', limit: 500 }),
  ])

  return (
    <ProgramDetail program={program} lessonTemplates={templatesResult.docs} teachers={teachersResult.docs} />
  )
}
