'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { Program } from '@/payload-types'
import { useLocale } from '../i18n/LocaleProvider'
import { SearchInput } from '../SearchInput'
import { NewProgramDialog } from './NewProgramDialog'

// Deliberately not translated — see the comment on Programs.ts `soort`:
// regulier/maatwerk/CMK/KBW are the deployment's own Dutch domain
// vocabulary in both languages, not English terms needing translation.
const SOORT_LABEL: Record<string, string> = {
  regulier: 'Regulier',
  maatwerk: 'Maatwerk',
  cmk: 'CMK',
  kbw: 'KBW',
}

export function ProgramsList({ programs }: { programs: (Program & { lessonTemplateCount: number })[] }) {
  const router = useRouter()
  const { t } = useLocale()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return programs
    return programs.filter((program) => program.name.toLowerCase().includes(q))
  }, [programs, query])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('programs.title')}</h1>
          <p className="subtitle">{t('programs.subtitle')}</p>
        </div>
        <NewProgramDialog />
      </div>

      {programs.length === 0 ? (
        <div className="empty-state">
          <p>{t('programs.emptyTitle')}</p>
          <p>{t('programs.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder={t('programs.searchPlaceholder')} />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{t('programs.noSearchResults', { query })}</p>
            </div>
          ) : (
            <div className="grid-card">
              <div className="grid-scroll">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>{t('programs.columnName')}</th>
                      <th>{t('programs.columnSoort')}</th>
                      <th>{t('programs.columnLessons')}</th>
                      <th>{t('programs.columnPrice')}</th>
                      <th>{t('programs.columnActive')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((program) => (
                      <tr key={program.id} onClick={() => router.push(`/programs/${program.id}`)}>
                        <td>{program.name}</td>
                        <td>{program.soort ? SOORT_LABEL[program.soort] : t('common.none')}</td>
                        <td>{program.lessonTemplateCount}</td>
                        <td>{program.price != null ? `€${program.price}` : t('common.none')}</td>
                        <td>{program.active === false ? t('common.no') : t('common.yes')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
