'use client'

import { useRouter } from 'next/navigation'

import type { Program } from '@/payload-types'
import { NewProgramDialog } from './NewProgramDialog'

const SOORT_LABEL: Record<string, string> = {
  regulier: 'Regulier',
  maatwerk: 'Maatwerk',
  cmk: 'CMK',
  kbw: 'KBW',
}

export function ProgramsList({ programs }: { programs: (Program & { lessonTemplateCount: number })[] }) {
  const router = useRouter()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Programs</h1>
          <p className="subtitle">Lesson series that schools book onto.</p>
        </div>
        <NewProgramDialog />
      </div>

      {programs.length === 0 ? (
        <div className="empty-state">
          <p>No programs yet.</p>
          <p>Use the + New program button above to add one.</p>
        </div>
      ) : (
        <div className="grid-card">
          <div className="grid-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Soort</th>
                  <th>Lessons</th>
                  <th>Price</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id} onClick={() => router.push(`/programs/${program.id}`)}>
                    <td>{program.name}</td>
                    <td>{program.soort ? SOORT_LABEL[program.soort] : '—'}</td>
                    <td>{program.lessonTemplateCount}</td>
                    <td>{program.price != null ? `€${program.price}` : '—'}</td>
                    <td>{program.active === false ? 'No' : 'Yes'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
