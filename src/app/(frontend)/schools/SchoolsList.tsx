'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { School } from '@/payload-types'
import { useLocale } from '../i18n/LocaleProvider'
import { SearchInput } from '../SearchInput'
import { NewSchoolDialog } from './NewSchoolDialog'

export function SchoolsList({
  schools,
}: {
  schools: (School & { contactCount: number })[]
}) {
  const router = useRouter()
  const { t } = useLocale()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return schools
    return schools.filter((school) =>
      [school.name, school.city, school.phone].some((field) => field?.toLowerCase().includes(q)),
    )
  }, [schools, query])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('schools.title')}</h1>
          <p className="subtitle">{t('schools.subtitle')}</p>
        </div>
        <NewSchoolDialog />
      </div>

      {schools.length === 0 ? (
        <div className="empty-state">
          <p>{t('schools.emptyTitle')}</p>
          <p>{t('schools.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder={t('schools.searchPlaceholder')} />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{t('schools.noSearchResults', { query })}</p>
            </div>
          ) : (
            <div className="grid-card">
              <div className="grid-scroll">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>{t('schools.columnName')}</th>
                      <th>{t('schools.columnCity')}</th>
                      <th>{t('schools.columnPhone')}</th>
                      <th>{t('schools.columnContacts')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((school) => (
                      <tr key={school.id} onClick={() => router.push(`/schools/${school.id}`)}>
                        <td>{school.name}</td>
                        <td>{school.city || t('common.none')}</td>
                        <td>{school.phone || t('common.none')}</td>
                        <td>{school.contactCount}</td>
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
