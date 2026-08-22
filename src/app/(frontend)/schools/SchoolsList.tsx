'use client'

import { useRouter } from 'next/navigation'

import type { School } from '@/payload-types'
import { useLocale } from '../i18n/LocaleProvider'
import { NewSchoolDialog } from './NewSchoolDialog'

export function SchoolsList({
  schools,
}: {
  schools: (School & { contactCount: number })[]
}) {
  const router = useRouter()
  const { t } = useLocale()

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
                {schools.map((school) => (
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
    </div>
  )
}
