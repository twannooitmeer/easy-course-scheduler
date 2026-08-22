import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import config from '@/payload.config'
import { PAGE_SIZE, parsePageParam } from '../paginationConfig'
import { ProgramsList } from './ProgramsList'

export const dynamic = 'force-dynamic'

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fprograms')
  }

  const { page: pageParam, q } = await searchParams
  const page = parsePageParam(pageParam)
  const query = q?.trim() ?? ''

  const where: Where = query ? { name: { contains: query } } : {}

  const programsResult = await payload.find({
    collection: 'programs',
    depth: 0,
    sort: 'name',
    where,
    page,
    limit: PAGE_SIZE,
  })

  const programIds = programsResult.docs.map((program) => Number(program.id))
  const templatesResult =
    programIds.length > 0
      ? await payload.find({
          collection: 'lesson-templates',
          depth: 0,
          where: { program: { in: programIds } },
          limit: 5000,
        })
      : { docs: [] }

  const templateCountByProgram = new Map<number, number>()
  for (const template of templatesResult.docs) {
    const programId = typeof template.program === 'object' ? template.program.id : template.program
    templateCountByProgram.set(programId, (templateCountByProgram.get(programId) ?? 0) + 1)
  }

  const programs = programsResult.docs.map((program) => ({
    ...program,
    lessonTemplateCount: templateCountByProgram.get(Number(program.id)) ?? 0,
  }))

  return (
    <ProgramsList
      programs={programs}
      query={query}
      page={programsResult.page ?? 1}
      totalPages={programsResult.totalPages ?? 1}
      totalDocs={programsResult.totalDocs}
    />
  )
}
