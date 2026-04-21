'use client'
import { useCallback, useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { datalogLanguage } from './datalog-lang'
import { useMinigraf } from '@/hooks/useMinigraf'
import type { QueryResult } from '@/lib/types'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  onResult: (result: QueryResult, queryCode?: string) => void
  onError: (error: string) => void
}

export function QueryEditor({ value, onChange, onResult, onError }: QueryEditorProps) {
  const { status, error: wasmError, query } = useMinigraf()
  const [queryError, setQueryError] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setQueryError(null)
    try {
      const result = await query(value)
      onResult(result, value)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setQueryError(msg)
      onError(msg)
    }
  }, [value, query, onResult, onError])

  const runKeymap = keymap.of([{
    key: 'Ctrl-Enter',
    mac: 'Cmd-Enter',
    run: () => { handleRun(); return true },
  }])

  const handleChange = useCallback((val: string) => {
    setQueryError(null)
    onChange(val)
  }, [onChange])

  const displayError = queryError || wasmError

  const isReady = status === 'ready'
  const statusText = status === 'loading' ? 'Loading...' : status === 'ready' ? 'Ready' : status === 'error' ? 'Error' : ''

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          onChange={handleChange}
          extensions={[datalogLanguage, runKeymap]}
          theme="dark"
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: false,
          }}
        />
      </div>
      {displayError && (
        <div className="px-3 py-2 bg-red-900/50 text-red-300 text-sm border-t border-red-800">
          {queryError ? `Error: ${queryError}` : `WASM Error: ${wasmError}`}
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800 bg-gray-950">
        <span className="text-xs text-gray-500">
          {statusText}
        </span>
        <button
          onClick={handleRun}
          disabled={!isReady}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
        >
          <span>▶</span> Run
        </button>
      </div>
    </div>
  )
}