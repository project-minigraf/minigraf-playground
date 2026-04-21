'use client'
import { ResultsTable } from './ResultsTable'
import type { QueryResult } from '@/lib/types'

interface ResultsPanelProps {
  result: QueryResult | null
  error: string | null
  query?: string
}

export function ResultsPanel({ result, error, query }: ResultsPanelProps) {
  const rowCount = result?.rows.length ?? 0
  const executionTime = result?.executionTimeMs ?? 0
  const hasError = !!error

  const truncatedQuery = query?.length && query.length > 40
    ? query.slice(0, 40) + '…'
    : query

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
          {hasError ? (
            <span className="text-red-400">Error</span>
          ) : result ? (
            <>
              {query && (
                <span className="truncate text-gray-400" title={query}>
                  {truncatedQuery}
                </span>
              )}
              <span>{rowCount} row{rowCount !== 1 ? 's' : ''} · {executionTime}ms</span>
            </>
          ) : (
            <span>Results</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {hasError ? (
          <div className="m-3 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-400 text-sm font-mono">
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        ) : !result ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Run a query to see results.
          </div>
        ) : (
          <ResultsTable result={result} />
        )}
      </div>
    </div>
  )
}