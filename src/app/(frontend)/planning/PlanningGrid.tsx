'use client'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
} from '@tanstack/react-table'
import { Fragment, useRef, useState, useTransition } from 'react'

import { ConfirmDialog, type ConfirmDialogHandle } from '../ConfirmDialog'
import { useLocale } from '../i18n/LocaleProvider'
import { useResetState } from '../useResetState'
import { bulkUpdateBookingStatus, deleteBooking, updateBooking } from './actions'
import { fromDateInputValue, toDateInputValue } from './dateHelpers'
import { LessonsPanel } from './LessonsPanel'
import { STATUS_OPTIONS, type BookingWithLessons, type TeacherOption } from './types'

const columnHelper = createColumnHelper<BookingWithLessons>()

function StatusSelect({
  bookingId,
  status,
}: {
  bookingId: number
  status: BookingWithLessons['status']
}) {
  const [value, setValue] = useState(status)
  const [, startTransition] = useTransition()

  return (
    <select
      className={`cell-select status-pill status-${value}`}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value as BookingWithLessons['status']
        setValue(next)
        startTransition(() => {
          updateBooking(bookingId, { status: next })
        })
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function StartDateInput({ bookingId, startDate }: { bookingId: number; startDate: string }) {
  const [value, setValue] = useState(toDateInputValue(startDate))
  const [, startTransition] = useTransition()

  return (
    <input
      type="date"
      className="cell-input"
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const iso = fromDateInputValue(value)
        if (!iso) return
        startTransition(() => {
          updateBooking(bookingId, { startDate: iso })
        })
      }}
    />
  )
}

export function PlanningGrid({
  bookings,
  teacherOptions,
}: {
  bookings: BookingWithLessons[]
  teacherOptions: TeacherOption[]
}) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useResetState<Set<number>>(bookings, () => new Set())
  const [bulkStatus, setBulkStatus] = useState<BookingWithLessons['status']>('nieuw')
  const [isBulkPending, setIsBulkPending] = useState(false)
  const confirmRef = useRef<ConfirmDialogHandle>(null)

  async function handleRequestDeleteBooking(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirmRef.current?.confirm(t('planning.confirmRemoveBooking'))
    if (!ok) return

    setError(null)
    const result = await deleteBooking(id)
    if (!result.success) setError(result.error)
  }

  function toggleOne(id: number, e: React.MouseEvent | React.ChangeEvent) {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === bookings.length ? new Set() : new Set(bookings.map((b) => b.id))))
  }

  async function handleApplyBulkStatus() {
    const statusLabel = STATUS_OPTIONS.find((opt) => opt.value === bulkStatus)?.label ?? bulkStatus
    const ok = await confirmRef.current?.confirm(
      t('planning.confirmBulkStatus', { status: statusLabel, count: selected.size }),
      { confirmLabel: t('planning.applyStatus'), destructive: false },
    )
    if (!ok) return

    setError(null)
    setIsBulkPending(true)
    const result = await bulkUpdateBookingStatus([...selected], bulkStatus)
    setIsBulkPending(false)
    if (result.success) {
      setSelected(new Set())
    } else {
      setError(result.error)
    }
  }

  const columns = [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selected.size === bookings.length && bookings.length > 0}
          onChange={toggleAll}
          aria-label={t('common.selectAll')}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.id)}
          onChange={(e) => toggleOne(row.original.id, e)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 24,
    }),
    columnHelper.display({
      id: 'expander',
      header: '',
      cell: ({ row }) => (
        <span className="expand-toggle">
          <span className={`chevron ${row.getIsExpanded() ? 'open' : ''}`}>▶</span>
        </span>
      ),
      size: 24,
    }),
    columnHelper.accessor((row) => (typeof row.school === 'object' ? row.school.name : row.school), {
      id: 'school',
      header: t('planning.columnSchool'),
    }),
    columnHelper.accessor((row) => (typeof row.program === 'object' ? row.program.name : row.program), {
      id: 'program',
      header: t('planning.columnProgram'),
    }),
    columnHelper.accessor('groupLabel', {
      header: t('planning.columnGroup'),
      cell: (info) => info.getValue() || t('common.none'),
    }),
    columnHelper.accessor('startDate', {
      header: t('planning.columnStartDate'),
      cell: (info) => <StartDateInput bookingId={info.row.original.id} startDate={info.getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: t('planning.columnStatus'),
      cell: (info) => <StatusSelect bookingId={info.row.original.id} status={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.lessons.length, {
      id: 'lessonCount',
      header: t('planning.columnLessons'),
      cell: (info) => <span className="lesson-count">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'remove',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          className="delete-button"
          aria-label={t('planning.removeBooking')}
          title={t('planning.removeBooking')}
          onClick={(e) => handleRequestDeleteBooking(row.original.id, e)}
        >
          ✕
        </button>
      ),
    }),
  ]

  const table = useReactTable({
    data: bookings,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (row) => String(row.id),
  })

  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('planning.emptyTitle')}</p>
        <p>{t('planning.emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="grid-card">
      {error && <p className="error-banner">{error}</p>}
      {selected.size > 0 && (
        <div className="bulk-actions-bar bulk-actions-bar-standalone">
          <span>{t('common.selectedCount', { count: selected.size })}</span>
          <select
            className="bulk-status-select"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as BookingWithLessons['status'])}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="button" className="primary" onClick={handleApplyBulkStatus} disabled={isBulkPending}>
            {isBulkPending ? t('planning.applyingStatus') : t('planning.applyStatus')}
          </button>
        </div>
      )}
      <div className="grid-scroll">
        <table className="bookings-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className={header.column.id === 'select' ? 'checkbox-column' : undefined}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className={`booking-row ${row.getIsExpanded() ? 'expanded' : ''}`}
                  onClick={() => row.toggleExpanded()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cell.column.id === 'select' ? 'checkbox-column' : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr className="lessons-row">
                    <td colSpan={row.getVisibleCells().length}>
                      <LessonsPanel
                        bookingId={row.original.id}
                        lessons={row.original.lessons}
                        teacherOptions={teacherOptions}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog ref={confirmRef} />
    </div>
  )
}
