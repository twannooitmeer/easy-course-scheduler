'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import type { Program } from '@/payload-types'
import { BulkActionsBar } from '../BulkActionsBar'
import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { ImportCsvDialog } from '../ImportCsvDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { PAGE_SIZE } from '../paginationConfig'
import { Pagination } from '../Pagination'
import { SearchInput } from '../SearchInput'
import { useResetState } from '../useResetState'
import { deletePrograms, importProgramsCsv } from './actions'
import { NewProgramDialog } from './NewProgramDialog'

const CSV_TEMPLATE_COLUMNS = [
  'name',
  'description',
  'soort',
  'defaultLessonCount',
  'defaultLessonDurationMinutes',
  'price',
  'active',
]
const CSV_TEMPLATE_EXAMPLE = ['Example Program', '', 'regulier', '8', '60', '250', 'true']

// Deliberately not translated — see the comment on Programs.ts `soort`:
// regulier/maatwerk/CMK/KBW are the deployment's own Dutch domain
// vocabulary in both languages, not English terms needing translation.
const SOORT_LABEL: Record<string, string> = {
  regulier: 'Regulier',
  maatwerk: 'Maatwerk',
  cmk: 'CMK',
  kbw: 'KBW',
}

export function ProgramsList({
  programs,
  query,
  page,
  totalPages,
  totalDocs,
}: {
  programs: (Program & { lessonTemplateCount: number })[]
  query: string
  page: number
  totalPages: number
  totalDocs: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()
  const [searchValue, setSearchValue] = useResetState(query, () => query)
  const [selected, setSelected] = useResetState<Set<number>>(programs, () => new Set())
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
    setSelected((prev) => (prev.size === programs.length ? new Set() : new Set(programs.map((p) => p.id))))
  }

  async function handleBulkRemove() {
    const ok = await confirmRef.current?.confirm(t('programs.confirmBulkRemove', { count: selected.size }))
    if (!ok) return

    setError(null)
    setIsPending(true)
    const result = await deletePrograms([...selected])
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
          <h1>{t('programs.title')}</h1>
          <p className="subtitle">{t('programs.subtitle')}</p>
        </div>
        <div className="page-header-actions">
          <ImportCsvDialog
            entityLabel={t('programs.title')}
            templateColumns={CSV_TEMPLATE_COLUMNS}
            templateExampleRow={CSV_TEMPLATE_EXAMPLE}
            onImport={importProgramsCsv}
          />
          <NewProgramDialog />
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {programs.length === 0 && !query ? (
        <div className="empty-state">
          <p>{t('programs.emptyTitle')}</p>
          <p>{t('programs.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchInput value={searchValue} onChange={handleSearchInput} placeholder={t('programs.searchPlaceholder')} />
            <BulkActionsBar count={selected.size} onRemove={handleBulkRemove} isPending={isPending} />
          </div>

          {programs.length === 0 ? (
            <div className="empty-state">
              <p>{t('programs.noSearchResults', { query })}</p>
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
                          checked={selected.size === programs.length && programs.length > 0}
                          onChange={toggleAll}
                          aria-label={t('common.selectAll')}
                        />
                      </th>
                      <th>{t('programs.columnName')}</th>
                      <th>{t('programs.columnSoort')}</th>
                      <th>{t('programs.columnLessons')}</th>
                      <th>{t('programs.columnPrice')}</th>
                      <th>{t('programs.columnActive')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((program) => (
                      <tr key={program.id} onClick={() => router.push(`/programs/${program.id}`)}>
                        <td className="checkbox-column" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(program.id)}
                            onChange={() => toggleOne(program.id)}
                            aria-label={program.name}
                          />
                        </td>
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
