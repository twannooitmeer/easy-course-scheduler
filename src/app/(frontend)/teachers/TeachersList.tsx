'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import type { Teacher } from '@/payload-types'
import { BulkActionsBar } from '../BulkActionsBar'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { PAGE_SIZE } from '../paginationConfig'
import { Pagination } from '../Pagination'
import { SearchInput } from '../SearchInput'
import { useResetState } from '../useResetState'
import { deleteTeachers } from './actions'
import { NewTeacherDialog } from './NewTeacherDialog'

export function TeachersList({
  teachers,
  query,
  page,
  totalPages,
  totalDocs,
}: {
  teachers: Teacher[]
  query: string
  page: number
  totalPages: number
  totalDocs: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()
  const [searchValue, setSearchValue] = useResetState(query, () => query)
  const [selected, setSelected] = useResetState<Set<number>>(teachers, () => new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const confirmRef = useRef<ConfirmDialogHandle>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function navigate(nextPage: number, nextQuery: string) {
    const params = new URLSearchParams()
    if (nextQuery) params.set('q', nextQuery)
    if (nextPage > 1) params.set('page', String(nextPage))
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleSearchInput(value: string) {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => navigate(1, value), 400)
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === teachers.length ? new Set() : new Set(teachers.map((t) => t.id))))
  }

  async function handleBulkRemove() {
    const ok = await confirmRef.current?.confirm(t('teachers.confirmBulkRemove', { count: selected.size }))
    if (!ok) return

    setError(null)
    setIsPending(true)
    const result = await deleteTeachers([...selected])
    setIsPending(false)
    if (result.success) {
      setSelected(new Set())
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleDeleteOne(teacher: Teacher, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirmRef.current?.confirm(t('teachers.confirmRemoveTeacher', { name: teacher.displayName }))
    if (!ok) return

    setError(null)
    const result = await deleteTeachers([teacher.id])
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

      {teachers.length === 0 && !query ? (
        <div className="empty-state">
          <p>{t('teachers.emptyTitle')}</p>
          <p>{t('teachers.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchInput value={searchValue} onChange={handleSearchInput} placeholder={t('teachers.searchPlaceholder')} />
            <BulkActionsBar count={selected.size} onRemove={handleBulkRemove} isPending={isPending} />
          </div>

          {teachers.length === 0 ? (
            <div className="empty-state">
              <p>{t('teachers.noSearchResults', { query })}</p>
            </div>
          ) : (
            <div className="grid-card">
              <div className="grid-scroll">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selected.size === teachers.length && teachers.length > 0}
                          onChange={toggleAll}
                          aria-label={t('common.selectAll')}
                        />
                      </th>
                      <th>{t('teachers.columnName')}</th>
                      <th>{t('teachers.columnType')}</th>
                      <th>{t('teachers.columnEmail')}</th>
                      <th>{t('teachers.columnPhone')}</th>
                      <th>{t('teachers.columnActive')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} onClick={() => router.push(`/teachers/${teacher.id}`)}>
                        <td className="checkbox-column" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(teacher.id)}
                            onChange={() => toggleOne(teacher.id)}
                            aria-label={teacher.displayName}
                          />
                        </td>
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
                            onClick={(e) => handleDeleteOne(teacher, e)}
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

          <Pagination
            page={page}
            totalPages={totalPages}
            totalDocs={totalDocs}
            pageSize={PAGE_SIZE}
            onPageChange={(nextPage) => navigate(nextPage, query)}
          />
        </>
      )}

      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
