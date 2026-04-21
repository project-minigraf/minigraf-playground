'use client'
import { useState, useCallback, useEffect } from 'react'
import { NavBar } from './NavBar'
import { ResizeHandle } from './ResizeHandle'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { ResultsPanel } from '@/components/results/ResultsPanel'
import { LessonSidebar } from '@/components/lessons/LessonSidebar'
import { SettingsDrawer } from '@/components/settings/SettingsDrawer'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { getSessionPrefs, setSessionPrefs } from '@/lib/storage'
import type { QueryResult, SessionPrefs } from '@/lib/types'

type Mode = 'sandbox' | 'lessons'

const DEFAULT_CODE = `(transact [[:alice :friend :bob]
           [:bob :friend :charlie]])

(query [:find ?x
        :where [:alice :friend ?x]])`

export function AppShell() {
  const [mode, setMode] = useState<Mode>('sandbox')
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(66)
  const [editorValue, setEditorValue] = useState(DEFAULT_CODE)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [sessionPrefs, setSessionPrefsState] = useState<SessionPrefs | null>(null)

  useEffect(() => {
    getSessionPrefs().then((prefs) => {
      if (prefs?.mode) {
        setMode(prefs.mode)
      }
      setSessionPrefsState(prefs)
    })
  }, [])

  const handleResize = useCallback((deltaX: number) => {
    setLeftWidthPct((prev) => {
      const containerWidth = window.innerWidth
      const deltaPct = (deltaX / containerWidth) * 100
      const newPct = prev + deltaPct
      return Math.min(80, Math.max(40, newPct))
    })
  }, [])

  const handleModeChange = useCallback(async (m: Mode) => {
    setMode(m)
    const prefs: SessionPrefs = { provider: 'gemini', model: '', mode: m }
    await setSessionPrefs(prefs)
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
        {/* Lesson sidebar - lessons mode only */}
        {mode === 'lessons' && (
          <LessonSidebar 
            activeLessonId={activeLessonId} 
            onSelect={setActiveLessonId} 
          />
        )}

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
          {/* Results */}
          <div className="h-1/2 border-t border-gray-800 overflow-hidden">
            <ResultsPanel result={queryResult} error={queryError} />
          </div>
        </div>

        {/* Resize handle */}
        <ResizeHandle onResize={handleResize} />

        {/* Right panel - Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            chatKey={mode === 'lessons' ? (activeLessonId ?? 'sandbox') : 'sandbox'}
            provider={sessionPrefs?.provider ?? 'groq'}
            model={sessionPrefs?.model ?? 'llama-3.3-70b-versatile'}
            systemPrompt=""
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      {/* Settings drawer */}
      {settingsOpen && (
        <SettingsDrawer onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}