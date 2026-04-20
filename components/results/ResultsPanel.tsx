'use client'
import { useState } from 'react'
import { ResultsTable } from './ResultsTable'
import type { QueryResult } from '@/lib/types'

interface ResultsPanelProps {
  result: QueryResult | null
  error: string | null
}

export function ResultsPanel({ result, error }: ResultsPanelProps) {
  const [showGraph, setShowGraph] = useState(false)

  const rowCount = result?.rows.length ?? 0
  const hasError = !!error
  const canShowGraph = !!result

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="text-xs text-gray-500">
          {hasError ? (
            <span className="text-red-400">Error</span>
          ) : result ? (
            <span>{rowCount} row{rowCount !== 1 ? 's' : ''}</span>
          ) : (
            <span>Results</span>
          )}
        </div>
        <button
          onClick={() => setShowGraph(!showGraph)}
          disabled={!canShowGraph}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            result 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          ⬡ Graph
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {hasError ? (
          <div className="border border-red-800 bg-red-900/20 rounded p-3">
            <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        ) : result ? (
          <ResultsTable result={result} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Run a query to see results.
          </div>
        )}
      </div>
    </div>
  )
}