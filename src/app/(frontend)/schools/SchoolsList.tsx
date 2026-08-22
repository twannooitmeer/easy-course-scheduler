'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import type { School } from '@/payload-types'
import { BulkActionsBar } from '../BulkActionsBar'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { ImportCsvDialog } from '../ImportCsvDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { PAGE_SIZE } from '../paginationConfig'
import { Pagination } from '../Pagination'
import { SearchInput } from '../SearchInput'
import { useResetState } from '../useResetState'
import { deleteSchools, importSchoolsCsv } from './actions'
import { NewSchoolDialog } from './NewSchoolDialog'

const CSV_TEMPLATE_COLUMNS = [
  'name',
  'street',
  'houseNumber',
  'addition',
  'postalCode',
  'city',
  'country',
  'phone',
  'defaultLocationNote',
  'notes',
]
const CSV_TEMPLATE_EXAMPLE = [
  'Example School',
  'Main Street',
  '1',
  '',
  '1234 AB',
  'Amsterdam',
  'Nederland',
  '020-1234567',
  'gymlokaal',
  '',
]

export function SchoolsList({
  schools,
  query,
  page,
  totalPages,
  totalDocs,
}: {
  schools: (School & { contactCount: number })[]
  query: string
  page: number
  totalPages: number
  totalDocs: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()
  const [searchValue, setSearchValue] = useResetState(query, () => query)
  const [selected, setSelected] = useResetState<Set<number>>(schools, () => new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const confirmRef = useRef<ConfirmDialogHandle>(null)

  function navigate(nextPage: number, nextQuery: string) {
    const params = new URLSearchParams()
    if (nextQuery) params.set('q', nextQuery)
    if (nextPage > 1) params.set('page', String(nextPage))
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    setSelected((prev) => (prev.size === schools.length ? new Set() : new Set(schools.map((s) => s.id))))
  }

  async function handleBulkRemove() {
    const ok = await confirmRef.current?.confirm(t('schools.confirmBulkRemove', { count: selected.size }))
    if (!ok) return

    setError(null)
    setIsPending(true)
    const result = await deleteSchools([...selected])
    setIsPending(false)
    if (result.success) {
      setSelected(new Set())
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{t('schools.title')}</h1>
          <p className="subtitle">{t('schools.subtitle')}</p>
        </div>
        <div className="page-header-actions">
          <ImportCsvDialog
            entityLabel={t('schools.title')}
            templateColumns={CSV_TEMPLATE_COLUMNS}
            templateExampleRow={CSV_TEMPLATE_EXAMPLE}
            onImport={importSchoolsCsv}
          />
          <NewSchoolDialog />
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {schools.length === 0 && !query ? (
        <div className="empty-state">
          <p>{t('schools.emptyTitle')}</p>
          <p>{t('schools.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchInput value={searchValue} onChange={handleSearchInput} placeholder={t('schools.searchPlaceholder')} />
            <BulkActionsBar count={selected.size} onRemove={handleBulkRemove} isPending={isPending} />
          </div>

          {schools.length === 0 ? (
            <div className="empty-state">
              <p>{t('schools.noSearchResults', { query })}</p>
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
                          checked={selected.size === schools.length && schools.length > 0}
                          onChange={toggleAll}
                          aria-label={t('common.selectAll')}
                        />
                      </th>
                      <th>{t('schools.columnName')}</th>
                      <th>{t('schools.columnCity')}</th>
                      <th>{t('schools.columnPhone')}</th>
                      <th>{t('schools.columnContacts')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((school) => (
                      <tr key={school.id} onClick={() => router.push(`/schools/${school.id}`)}>
                        <td className="checkbox-column" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(school.id)}
                            onChange={() => toggleOne(school.id)}
                            aria-label={school.name}
                          />
                        </td>
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
