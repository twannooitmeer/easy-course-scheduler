'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'

import type { Teacher } from '@/payload-types'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { SearchInput } from '../SearchInput'
import { deleteTeacher } from './actions'
import { NewTeacherDialog } from './NewTeacherDialog'

export function TeachersList({ teachers }: { teachers: Teacher[] }) {
  const router = useRouter()
  const { t } = useLocale()
  const confirmRef = useRef<ConfirmDialogHandle>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter((teacher) =>
      [teacher.displayName, teacher.email, teacher.phone].some((field) => field?.toLowerCase().includes(q)),
    )
  }, [teachers, query])

  async function handleDelete(teacher: Teacher, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirmRef.current?.confirm(t('teachers.confirmRemoveTeacher', { name: teacher.displayName }))
    if (!ok) return

    setError(null)
    const result = await deleteTeacher(teacher.id)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('teachers.title')}</h1>
          <p className="subtitle">{t('teachers.subtitle')}</p>
        </div>
        <NewTeacherDialog />
      </div>

      {error && <p className="error-banner">{error}</p>}

      {teachers.length === 0 ? (
        <div className="empty-state">
          <p>{t('teachers.emptyTitle')}</p>
          <p>{t('teachers.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder={t('teachers.searchPlaceholder')} />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>{t('teachers.noSearchResults', { query })}</p>
            </div>
          ) : (
            <div className="grid-card">
              <div className="grid-scroll">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>{t('teachers.columnName')}</th>
                      <th>{t('teachers.columnType')}</th>
                      <th>{t('teachers.columnEmail')}</th>
                      <th>{t('teachers.columnPhone')}</th>
                      <th>{t('teachers.columnActive')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((teacher) => (
                      <tr key={teacher.id} onClick={() => router.push(`/teachers/${teacher.id}`)}>
                        <td>{teacher.displayName}</td>
                        <td>{teacher.kind === 'organisation' ? t('teachers.typeOrganisation') : t('teachers.typePerson')}</td>
                        <td>{teacher.email || t('common.none')}</td>
                        <td>{teacher.phone || t('common.none')}</td>
                        <td>{teacher.active === false ? t('common.no') : t('common.yes')}</td>
                        <td>
                          <button
                            type="button"
                            className="delete-button"
                            aria-label={t('teachers.removeTeacher')}
                            title={t('teachers.removeTeacher')}
                            onClick={(e) => handleDelete(teacher, e)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
