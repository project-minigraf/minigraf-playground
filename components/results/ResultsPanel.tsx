'use client'
import { useState } from 'react'
import { ResultsTable } from './ResultsTable'
import { ResultsGraph } from './ResultsGraph'
import type { QueryResult } from '@/lib/types'

interface ResultsPanelProps {
  result: QueryResult | null
  error: string | null
}

export function ResultsPanel({ result, error }: ResultsPanelProps) {
  const [showGraph, setShowGraph] = useState(false)

  const rowCount = result?.rows.length ?? 0
  const executionTime = result?.executionTimeMs ?? 0
  const hasError = !!error
  const canGraph = result !== null && result.columns.length === 2

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="text-xs text-gray-500">
          {hasError ? (
            <span className="text-red-400">Error</span>
          ) : result ? (
            <span>{rowCount} row{rowCount !== 1 ? 's' : ''} · {executionTime}ms</span>
          ) : (
            <span>Results</span>
          )}
        </div>
        <button
          onClick={() => setShowGraph((p) => !p)}
          disabled={!canGraph}
          title={canGraph ? 'Toggle graph view' : 'Graph requires exactly 2 columns'}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            showGraph && canGraph
              ? 'bg-blue-600 text-white' 
              : canGraph
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
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