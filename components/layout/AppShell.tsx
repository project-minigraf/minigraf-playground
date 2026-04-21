'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { NavBar } from './NavBar'
import { ResizeHandle } from './ResizeHandle'
import dynamic from 'next/dynamic'
const QueryEditor = dynamic(
  () => import('@/components/editor/QueryEditor').then((m) => ({ default: m.QueryEditor })),
  { ssr: false }
)
import { ResultsPanel } from '@/components/results/ResultsPanel'
import { LessonSidebar } from '@/components/lessons/LessonSidebar'
import { SettingsDrawer } from '@/components/settings/SettingsDrawer'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { getSessionPrefs, setSessionPrefs, clearAllChatHistory } from '@/lib/storage'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { useMinigraf } from '@/hooks/useMinigraf'
import { useLesson } from '@/hooks/useLesson'
import type { QueryResult, SessionPrefs } from '@/lib/types'

type Mode = 'sandbox' | 'lessons'

const LESSON_INTROS: Record<string, { lessonTitle: string; lessonGoals: string; currentStep?: string }> = {
  'lesson-1': { lessonTitle: 'Basic Facts and Queries', lessonGoals: 'asserting and retracting facts, running basic Datalog queries, and reading query results' },
  'lesson-2': { lessonTitle: 'Rules and Inference', lessonGoals: 'defining rules to derive new facts, and using recursive rules for graph traversal' },
  'lesson-3': { lessonTitle: 'Recursive Rules', lessonGoals: 'writing fixed-point recursive rules and understanding semi-naive evaluation' },
  'lesson-4': { lessonTitle: 'Bi-temporal Time Travel', lessonGoals: 'valid-time and transaction-time axes, backdating facts, and querying historical snapshots' },
}

const DEFAULT_CODE = `(transact [[:alice :friend :bob]
           [:bob :friend :charlie]])

(query [:find ?x
        :where [:alice :friend ?x]])`

export function AppShell() {
  const [mode, setMode] = useState<Mode>('sandbox')
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [lessonStepGoal, setLessonStepGoal] = useState<string | null>(null)
  const [lessonCompletedSteps, setLessonCompletedSteps] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(66)
  const [editorValue, setEditorValue] = useState(DEFAULT_CODE)
  const [completedStepsPerLesson, setCompletedStepsPerLesson] = useState<Record<string, string[]>>({})
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string>('')
  const [sessionPrefs, setSessionPrefsState] = useState<SessionPrefs | null>(null)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  useEffect(() => {
    getSessionPrefs().then((prefs) => {
      if (prefs?.mode) {
        setMode(prefs.mode)
        if (prefs.mode === 'lessons' && prefs.activeLessonId) {
          setActiveLessonId(prefs.activeLessonId)
        }
      }
      setSessionPrefsState(prefs)
      setPrefsLoaded(true)
    })
  }, [])

  // Clear chat history when provider changes to avoid stale errors
  const prevProviderRef = useRef<string | null>(null)
  useEffect(() => {
    const currentProvider = sessionPrefs?.provider
    if (currentProvider && prevProviderRef.current !== null && prevProviderRef.current !== currentProvider) {
      clearAllChatHistory()
    }
    prevProviderRef.current = currentProvider ?? null
  }, [sessionPrefs?.provider])

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
    if (m === 'lessons' && !activeLessonId) {
      setActiveLessonId('lesson-1')
    }
    if (m !== 'lessons') {
      setLessonStepGoal(null)
      setLessonCompletedSteps([])
    }
    const prefs: SessionPrefs = { provider: 'gemini', model: '', mode: m }
    await setSessionPrefs(prefs)
  }, [activeLessonId])

  const handleActiveLessonChange = useCallback(async (id: string) => {
    setActiveLessonId(id)
    setLessonStepGoal(null)
    setLessonCompletedSteps([])
    const prefs: SessionPrefs = { provider: sessionPrefs?.provider ?? 'groq', model: sessionPrefs?.model ?? '', mode, activeLessonId: id }
    await setSessionPrefs(prefs)
  }, [sessionPrefs, mode])

  const { status, error: wasmError, query } = useMinigraf()
  const lessonRunner = useLesson(mode === 'lessons' ? activeLessonId : null)
  const [lessonReady, setLessonReady] = useState(false)

  useEffect(() => {
    if (lessonRunner.starterCode) {
      setEditorValue(lessonRunner.starterCode)
    }
  }, [lessonRunner.starterCode])

  useEffect(() => {
    if (lessonRunner.lesson && lessonRunner.totalSteps > 0) {
      setLessonReady(true)
    }
  }, [lessonRunner.lesson, lessonRunner.totalSteps])

  useEffect(() => {
    if (activeLessonId) {
      setCompletedStepsPerLesson((prev) => ({
        ...prev,
        [activeLessonId]: lessonRunner.completedSteps,
      }))
    }
  }, [activeLessonId, lessonRunner.completedSteps])

  const handleResult = useCallback(async (result: QueryResult, queryCode?: string) => {
    setQueryResult(result)
    setQueryError(null)
    if (queryCode) {
      setLastQuery(queryCode)
    }
    if (mode === 'lessons' && activeLessonId) {
      await lessonRunner.submitResult(result)
    }
  }, [mode, activeLessonId, lessonRunner])

  const handleError = useCallback((error: string) => {
    setQueryError(error)
    setQueryResult(null)
  }, [])

  const handleRunQueryFromChat = useCallback((code: string) => {
    if (status !== 'ready') return
    setLastQuery(code)
    query(code).then((result) => handleResult(result, code)).catch(handleError)
  }, [status, query, handleResult, handleError])

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
            completedStepsPerLesson={completedStepsPerLesson}
            currentStepIndex={lessonRunner.stepIndex}
            totalSteps={lessonRunner.totalSteps}
            onSelect={handleActiveLessonChange}
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
            <ResultsPanel result={queryResult} error={queryError} query={lastQuery} />
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
            systemPrompt={buildSystemPrompt({ 
              lessonStepGoal: lessonRunner.currentStep?.instruction ?? lessonStepGoal, 
              progress: lessonCompletedSteps 
            })}
            introContext={mode === 'lessons' && activeLessonId ? {
              ...LESSON_INTROS[activeLessonId],
              currentStep: lessonRunner.currentStep?.instruction ?? undefined,
            } : undefined}
            introEnabled={prefsLoaded && (mode !== 'lessons' ? true : lessonReady)}
            onOpenSettings={() => setSettingsOpen(true)}
            onRunQuery={status === 'ready' ? handleRunQueryFromChat : undefined}
          />
        </div>
      </div>

      {/* Settings drawer */}
      {settingsOpen && (
        <SettingsDrawer onClose={async () => {
          setSettingsOpen(false)
          const prefs = await getSessionPrefs()
          setSessionPrefsState(prefs)
        }} />
      )}
    </div>
  )
}