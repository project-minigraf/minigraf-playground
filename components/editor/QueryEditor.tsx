'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { datalogLanguage } from './datalog-lang'
import { useMinigraf } from '@/hooks/useMinigraf'
import type { QueryResult } from '@/lib/types'
import { encodeQuery } from '@/lib/share'

// CodeMirror state machinery for error line highlighting
const addErrorLine = StateEffect.define<number>()   // 1-based line number
const clearErrorLine = StateEffect.define<null>()

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(clearErrorLine)) return Decoration.none
      if (e.is(addErrorLine) && e.value >= 1 && e.value <= tr.state.doc.lines) {
        const line = tr.state.doc.line(e.value)
        return Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(line.from)])
      }
    }
    return tr.docChanged ? deco.map(tr.changes) : deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  onResult: (result: QueryResult, queryCode?: string) => void
  onError: (error: string, queryCode?: string) => void
}

export function QueryEditor({ value, onChange, onResult, onError }: QueryEditorProps) {
  const { status, error: wasmError, query } = useMinigraf('sandbox')
  const [queryError, setQueryError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const viewRef = useRef<EditorView | null>(null)

  const handleRun = useCallback(async () => {
    setQueryError(null)
    try {
      const result = await query(value)
      onResult(result, value)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setQueryError(msg)
      onError(msg, value)
    }
  }, [value, query, onResult, onError])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleRun()
    }
  }, [handleRun])

  const handleChange = useCallback((val: string) => {
    setQueryError(null)
    onChange(val)
  }, [onChange])

  // Dispatch error line highlight / clear whenever queryError changes
  useEffect(() => {
    if (!viewRef.current) return
    if (queryError) {
      const match = /line (\d+)/i.exec(queryError)
      if (match) {
        viewRef.current.dispatch({ effects: addErrorLine.of(Number(match[1])) })
      }
    } else {
      viewRef.current.dispatch({ effects: clearErrorLine.of(null) })
    }
  }, [queryError])

  const share = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#q=${encodeQuery(value)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed — do not show "Copied" confirmation
    }
  }, [value])

  const displayError = queryError || wasmError

  const isReady = status === 'ready'
  const statusText = status === 'loading' ? 'Loading...' : status === 'ready' ? 'Ready' : status === 'error' ? 'Error' : ''

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          onChange={handleChange}
          extensions={[datalogLanguage, errorLineField]}
          theme="dark"
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: false,
          }}
          onCreateEditor={(view: EditorView) => {
            viewRef.current = view
            view.scrollDOM.addEventListener('keydown', handleKeyDown)
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
        <div className="flex items-center gap-2">
          <button
            onClick={share}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md transition-colors"
          >
            {copied ? '✓ Copied' : 'Share'}
          </button>
          <button
            onClick={handleRun}
            disabled={!isReady}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
          >
            <span>▶</span> Run
          </button>
        </div>
      </div>
    </div>
  )
}
