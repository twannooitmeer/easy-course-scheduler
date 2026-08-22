import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ProgramsList } from './ProgramsList'

export const dynamic = 'force-dynamic'

export default async function ProgramsPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/admin/login?redirect=%2Fprograms')
  }

  const [programsResult, templatesResult] = await Promise.all([
    payload.find({ collection: 'programs', depth: 0, sort: 'name', limit: 500 }),
    payload.find({ collection: 'lesson-templates', depth: 0, limit: 5000 }),
  ])

  const templateCountByProgram = new Map<number, number>()
  for (const template of templatesResult.docs) {
    const programId = typeof template.program === 'object' ? template.program.id : template.program
    templateCountByProgram.set(programId, (templateCountByProgram.get(programId) ?? 0) + 1)
  }

  const programs = programsResult.docs.map((program) => ({
    ...program,
    lessonTemplateCount: templateCountByProgram.get(Number(program.id)) ?? 0,
  }))

  return <ProgramsList programs={programs} />
}
