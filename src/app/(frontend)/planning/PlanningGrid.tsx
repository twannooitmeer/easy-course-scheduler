'use client'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
} from '@tanstack/react-table'
import Link from 'next/link'
import { Fragment, useState, useTransition } from 'react'

import { updateBooking } from './actions'
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
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const columns = [
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
      header: 'School',
    }),
    columnHelper.accessor((row) => (typeof row.program === 'object' ? row.program.name : row.program), {
      id: 'program',
      header: 'Program',
    }),
    columnHelper.accessor('groupLabel', {
      header: 'Group',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('startDate', {
      header: 'Start date',
      cell: (info) => <StartDateInput bookingId={info.row.original.id} startDate={info.getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusSelect bookingId={info.row.original.id} status={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.lessons.length, {
      id: 'lessonCount',
      header: 'Lessons',
      cell: (info) => <span className="lesson-count">{info.getValue()}</span>,
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
        <p>No bookings yet.</p>
        <p>
          Create one via <Link href="/admin/collections/bookings/create">+ New booking</Link> to see its
          generated lessons here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid-card">
      <div className="grid-scroll">
        <table className="bookings-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
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
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr className="lessons-row">
                    <td colSpan={row.getVisibleCells().length}>
                      <LessonsPanel lessons={row.original.lessons} teacherOptions={teacherOptions} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
