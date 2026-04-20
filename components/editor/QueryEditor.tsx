'use client'
import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { datalogLanguage } from './datalog-lang'
import { useMinigraf } from '@/hooks/useMinigraf'
import type { QueryResult } from '@/lib/types'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  onResult: (result: QueryResult) => void
  onError: (error: string) => void
}

export function QueryEditor({ value, onChange, onResult, onError }: QueryEditorProps) {
  const { status, error: wasmError, query } = useMinigraf()

  const handleRun = useCallback(async () => {
    try {
      const result = await query(value)
      onResult(result)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }, [value, query, onResult, onError])

  const handleChange = useCallback((val: string) => {
    onChange(val)
  }, [onChange])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          onChange={handleChange}
          extensions={[datalogLanguage]}
          theme="dark"
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: false,
          }}
        />
      </div>
      {status === 'error' && wasmError && (
        <div className="px-3 py-2 bg-red-900/50 text-red-300 text-sm border-t border-red-800">
          WASM Error: {wasmError}
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800 bg-gray-950">
        <span className="text-xs text-gray-500">
          {status === 'loading' ? 'Loading...' : status === 'ready' ? 'Ready' : 'Error'}
        </span>
        <button
          onClick={handleRun}
          disabled={status !== 'ready'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
        >
          <span>▶</span> Run
        </button>
      </div>
    </div>
  )
}