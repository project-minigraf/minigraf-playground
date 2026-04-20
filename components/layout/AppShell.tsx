'use client'
import { useState, useCallback } from 'react'
import { NavBar } from './NavBar'
import { ResizeHandle } from './ResizeHandle'
import { QueryEditor } from '@/components/editor/QueryEditor'
import type { QueryResult } from '@/lib/types'

type Mode = 'sandbox' | 'lessons'

const DEFAULT_CODE = `%% Minigraf Datalog — try these examples:
friend(alice, bob).
friend(bob, charlie).
?- friend(alice, ?x).
`

export function AppShell() {
  const [mode, setMode] = useState<Mode>('sandbox')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(66)
  const [editorValue, setEditorValue] = useState(DEFAULT_CODE)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  const handleResize = useCallback((deltaX: number) => {
    setLeftWidthPct((prev) => {
      const containerWidth = window.innerWidth
      const deltaPct = (deltaX / containerWidth) * 100
      const newPct = prev + deltaPct
      return Math.min(80, Math.max(40, newPct))
    })
  }, [])

  const handleModeChange = useCallback((m: Mode) => {
    setMode(m)
  }, [])

  const handleResult = useCallback((result: QueryResult) => {
    setQueryResult(result)
    setQueryError(null)
  }, [])

  const handleError = useCallback((error: string) => {
    setQueryError(error)
    setQueryResult(null)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <NavBar
        mode={mode}
        onModeChange={handleModeChange}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${leftWidthPct}%` }}
        >
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <QueryEditor
              value={editorValue}
              onChange={setEditorValue}
              onResult={handleResult}
              onError={handleError}
            />
          </div>
          {/* Results placeholder */}
          <div className="h-1/2 flex items-center justify-center text-gray-500 border-t border-gray-800">
            {queryError ? (
              <p className="text-red-400">Error: {queryError}</p>
            ) : queryResult ? (
              <pre className="text-sm text-green-400">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            ) : (
              <p>Results — run a query to see results</p>
            )}
          </div>
        </div>

        {/* Resize handle */}
        <ResizeHandle onResize={handleResize} />

        {/* Right panel - Chat */}
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Chat — coming in Task 2.4</p>
        </div>
      </div>

      {/* Settings drawer placeholder */}
      {settingsOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 p-4">
          <div className="text-gray-400">
            Settings drawer — coming in Task 2.5
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="mt-4 text-sm text-gray-500 hover:text-white"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}