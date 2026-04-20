'use client'
import { useState, useMemo } from 'react'
import type { QueryResult } from '@/lib/types'

interface ResultsTableProps {
  result: QueryResult
}

type SortState = {
  column: number
  direction: 'asc' | 'desc'
}

export function ResultsTable({ result }: ResultsTableProps) {
  const [sort, setSort] = useState<SortState>({ column: -1, direction: 'asc' })

  const sortedRows = useMemo(() => {
    if (sort.column < 0) return result.rows
    return [...result.rows].sort((a, b) => {
      const aVal = a[sort.column]
      const bVal = b[sort.column]
      
      let cmp: number
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else if (typeof aVal === 'number' || typeof bVal === 'number') {
        cmp = String(aVal).localeCompare(String(bVal))
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''))
      }
      return sort.direction === 'asc' ? cmp : -cmp
    })
  }, [result.rows, sort])

  function handleSort(column: number) {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  if (!result.columns.length || !result.rows.length) {
    return (
      <div className="text-gray-500 text-sm">No results</div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="text-sm">
        <thead>
          <tr>
            {result.columns.map((col, i) => (
              <th
                key={i}
                onClick={() => handleSort(i)}
                className="px-3 py-1.5 text-left cursor-pointer hover:bg-gray-800 select-none border-b border-gray-700 font-medium text-gray-300"
              >
                <span className="flex items-center gap-1">
                  {col}
                  {sort.column === i && (
                    <span className="text-blue-400">{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-800/50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-1.5 border-b border-gray-800 text-gray-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}