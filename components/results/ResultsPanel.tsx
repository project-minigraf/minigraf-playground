'use client'
import { useState, useEffect } from 'react'
import { ResultsTable } from './ResultsTable'
import { ResultsGraph } from './ResultsGraph'
import type { QueryResult } from '@/lib/types'

interface ResultsPanelProps {
  result: QueryResult | null
  error: string | null
  query?: string
}

export function ResultsPanel({ result, error, query }: ResultsPanelProps) {
  const [showGraph, setShowGraph] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const canGraph = result !== null && result.columns.length === 2
  const rowCount = result?.rows.length ?? 0
  const executionTime = result?.executionTimeMs ?? 0
  const hasError = !!error

  const truncatedQuery = query?.length && query.length > 40
    ? query.slice(0, 40) + '…'
    : query

  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
        <button
          onClick={() => setShowGraph((p) => !p)}
          disabled={!canGraph || isSmallScreen}
          title={
            isSmallScreen
              ? 'Graph view requires a wider screen'
              : canGraph
                ? 'Toggle graph view'
                : 'Graph requires exactly 2 columns'
          }
          className={`text-xs px-2 py-0.5 rounded transition-colors shrink-0 ${
            showGraph ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white disabled:opacity-30'
          }`}
        >
          ⬡ Graph
        </button>
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
        ) : showGraph && canGraph ? (
          <ResultsGraph result={result} />
        ) : (
          <ResultsTable result={result} />
        )}
      </div>
    </div>
  )
}
