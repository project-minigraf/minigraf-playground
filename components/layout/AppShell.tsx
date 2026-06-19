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
import { TutorialSidebar } from '@/components/lessons/TutorialSidebar'
import { SettingsDrawer } from '@/components/settings/SettingsDrawer'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { getSessionPrefs, setSessionPrefs, clearAllChatHistory } from '@/lib/storage'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { useMinigraf } from '@/hooks/useMinigraf'
import { useLesson } from '@/hooks/useLesson'
import { useTutorial } from '@/hooks/useTutorial'
import { buildNarratePayload, buildTutorContext } from '@/lib/tutor'
import type { QueryResult, SessionPrefs } from '@/lib/types'
import { decodeQuery } from '@/lib/share'

type Mode = 'sandbox' | 'lessons'
type MobileTab = 'editor' | 'results' | 'chat'

// Captured at module-load time (once per page load).
// Reading window.location.hash here — before any React lifecycle — ensures
// Strict Mode's mount/unmount/remount cycle does not lose the original hash value.
const INITIAL_SHARE_HASH = typeof window !== 'undefined' ? window.location.hash : ''


const DEFAULT_CODE = `(transact [[:alice :friend :bob]
           [:bob :friend :charlie]])

(query [:find ?x
        :where [:alice :friend ?x]])`

export function AppShell() {
  const [mode, setMode] = useState<Mode>('sandbox')
  const [activeTutorialId, setActiveTutorialIdState] = useState<string | null>(null)
  const [lessonStepGoal, setLessonStepGoal] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(66)
  const [editorValue, setEditorValue] = useState(DEFAULT_CODE)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string>('')
  const [tutorPayload, setTutorPayload] = useState<string | null>(null)
  const [sessionPrefs, setSessionPrefsState] = useState<SessionPrefs | null>(null)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [pendingOpenStepContext, setPendingOpenStepContext] = useState<{ instruction: string; code: string } | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor')
  const [isDesktop, setIsDesktop] = useState(true)

  const hashAppliedRef = useRef(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Read #q= hash on mount and pre-populate editor in sandbox mode
  useEffect(() => {
    if (INITIAL_SHARE_HASH.startsWith('#q=')) {
      const decoded = decodeQuery(INITIAL_SHARE_HASH.slice(3))
      if (decoded) {
        setEditorValue(decoded)
        setMode('sandbox')
        history.replaceState(null, '', window.location.pathname + window.location.search)
        hashAppliedRef.current = true
      }
    }
  }, [])

  // NOTE: This effect must be declared after the hash effect above.
  // The hash effect sets hashAppliedRef.current synchronously; this effect's
  // async .then() reads it. Reordering these two effects breaks the guard.
  useEffect(() => {
    getSessionPrefs().then((prefs) => {
      if (!hashAppliedRef.current) {
        if (prefs?.mode) {
          setMode(prefs.mode)
        }
        setActiveTutorialIdState(prefs?.activeTutorialId ?? 'basic-datalog')
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

  const tutorialManager = useTutorial(activeTutorialId)
  const { activeLessonId, completedStepsPerLesson } = tutorialManager
  const { status, error: wasmError, query } = useMinigraf(
    mode === 'lessons' ? (tutorialManager.activeTutorial?.id ?? 'sandbox') : 'sandbox'
  )
  const lessonRunner = useLesson(mode === 'lessons' ? activeLessonId : null)

  const handleModeChange = useCallback(async (m: Mode) => {
    setMode(m)
    if (m !== 'lessons') {
      setLessonStepGoal(null)
    }
    setTutorPayload(null)
    const prefs: SessionPrefs = {
      provider: sessionPrefs?.provider ?? 'groq',
      model: sessionPrefs?.model ?? 'llama-3.3-70b-versatile',
      mode: m,
      activeLessonId: tutorialManager.activeLessonId ?? undefined,
      activeTutorialId: tutorialManager.activeTutorial?.id ?? undefined,
    }
    await setSessionPrefs(prefs)
  }, [tutorialManager, sessionPrefs])

  const handleActiveLessonChange = useCallback(async (id: string) => {
    tutorialManager.setActiveLessonId(id)
    setLessonStepGoal(null)
    setTutorPayload(null)
    const prefs: SessionPrefs = {
      provider: sessionPrefs?.provider ?? 'groq',
      model: sessionPrefs?.model ?? '',
      mode,
      activeLessonId: id,
      activeTutorialId: tutorialManager.activeTutorial?.id ?? undefined,
    }
    await setSessionPrefs(prefs)
  }, [tutorialManager, sessionPrefs, mode])

  const [lessonReady, setLessonReady] = useState(false)

  useEffect(() => {
    if (lessonRunner.starterCode) {
      setEditorValue(lessonRunner.starterCode)
    }
  }, [lessonRunner.starterCode])

  useEffect(() => {
    if (lessonRunner.lesson && lessonRunner.totalSteps > 0) {
      setLessonReady(true)
    } else {
      setLessonReady(false)
    }
  }, [lessonRunner.lesson, lessonRunner.totalSteps])

  const lessonIntroTrigger =
    mode === 'lessons'
      ? `${activeLessonId ?? 'none'}:${lessonRunner.currentStep?.id ?? 'no-step'}`
      : 'sandbox'

  useEffect(() => {
    setPendingOpenStepContext(null)
  }, [lessonIntroTrigger])

  useEffect(() => {
    if (activeLessonId && lessonRunner.completedSteps.length > 0) {
      tutorialManager.setCompletedStepsPerLesson((prev) => ({
        ...prev,
        [activeLessonId]: lessonRunner.completedSteps,
      }))
    }
  }, [activeLessonId, lessonRunner.completedSteps]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResult = useCallback(async (result: QueryResult, queryCode?: string) => {
    setQueryResult(result)
    setQueryError(null)
    const nextQuery = queryCode ?? lastQuery
    if (queryCode) setLastQuery(queryCode)

    if (nextQuery) {
      setTutorPayload(
        buildNarratePayload(
          buildTutorContext({
            query: nextQuery,
            result,
            error: null,
            lessonStep: mode === 'lessons' ? lessonRunner.currentStep : null,
            conversationHistory: [],
          })
        )
      )
    }

    if (mode === 'lessons' && lessonRunner.currentStep && !lessonRunner.currentStep.expectedResult) {
      setPendingOpenStepContext({ instruction: lessonRunner.currentStep.instruction, code: editorValue })
    }

    if (mode === 'lessons' && activeLessonId) {
      await lessonRunner.submitResult(result)
    }
  }, [lastQuery, mode, activeLessonId, lessonRunner, editorValue])

  const handleError = useCallback((error: string, queryCode?: string) => {
    const nextQuery = queryCode ?? lastQuery
    if (queryCode) setLastQuery(queryCode)
    setQueryError(error)
    setQueryResult(null)
    if (nextQuery) {
      setTutorPayload(
        buildNarratePayload(
          buildTutorContext({
            query: nextQuery,
            result: null,
            error,
            lessonStep: mode === 'lessons' ? lessonRunner.currentStep : null,
            conversationHistory: [],
          })
        )
      )
    }
  }, [lastQuery, mode, lessonRunner.currentStep])

  const handleRunQueryFromChat = useCallback((code: string) => {
    if (status !== 'ready') return
    setLastQuery(code)
    query(code).then((result) => handleResult(result, code)).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      handleError(message, code)
    })
  }, [status, query, handleResult, handleError])

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <NavBar
        mode={mode}
        onModeChange={handleModeChange}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {/* Mobile: lesson step indicator */}
      {mode === 'lessons' && lessonRunner.currentStep && (
        <div className="md:hidden px-3 py-1.5 border-b border-gray-800 text-xs text-gray-500 truncate shrink-0">
          Step {lessonRunner.stepIndex + 1}/{lessonRunner.totalSteps}: {lessonRunner.currentStep.instruction.split('\n')[0].replace(/^#+\s*/, '')}
        </div>
      )}

      {/* Mobile: tab bar */}
      <div className="flex md:hidden border-b border-gray-800 shrink-0">
        {(['editor', 'results', 'chat'] as MobileTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 py-2 text-xs capitalize ${mobileTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Lesson sidebar - lessons mode only, hidden on mobile */}
        {mode === 'lessons' && (
          <div className="hidden md:contents">
            <TutorialSidebar
              activeTutorial={tutorialManager.activeTutorial}
              activeLessonId={activeLessonId}
              completedStepsPerLesson={completedStepsPerLesson}
              currentStepIndex={lessonRunner.stepIndex}
              totalSteps={lessonRunner.totalSteps}
              isUnlocked={tutorialManager.isUnlocked}
              onSelectLesson={handleActiveLessonChange}
              onSwitchTutorial={tutorialManager.switchTutorial}
            />
          </div>
        )}

        {/* Left panel (editor + results) */}
        <div
          className={`flex flex-col overflow-hidden ${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'}`}
          style={isDesktop ? { width: `${leftWidthPct}%` } : undefined}
        >
          {/* WASM status banners */}
          {status === 'loading' && (
            <div className="px-3 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-500 animate-pulse">
              Loading Minigraf WASM…
            </div>
          )}
          {status === 'error' && (
            <div className="px-3 py-2 bg-red-950/40 border-b border-red-800 text-xs text-red-400 flex items-center justify-between">
              <span>Failed to load Minigraf WASM.</span>
              <button onClick={() => window.location.reload()} className="underline hover:text-red-200">Reload</button>
            </div>
          )}
          {/* Editor — hidden on mobile results tab */}
          <div className={`${mobileTab === 'results' ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden`}>
            <QueryEditor
              value={editorValue}
              onChange={setEditorValue}
              onResult={handleResult}
              onError={handleError}
            />
          </div>
          {/* Results — hidden on mobile editor tab; full height on mobile results tab */}
          <div className={`${mobileTab === 'editor' ? 'hidden md:block' : 'block'} ${mobileTab === 'results' ? 'flex-1 md:flex-none' : ''} md:h-1/2 border-t border-gray-200 dark:border-gray-800 overflow-hidden`}>
            <ResultsPanel result={queryResult} error={queryError} query={lastQuery} />
          </div>
        </div>

        {/* Resize handle — hidden on mobile */}
        <div className="hidden md:flex">
          <ResizeHandle onResize={handleResize} />
        </div>

        {/* Right panel - Chat */}
        <div className={`${mobileTab !== 'chat' ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden`}>
          <ChatPanel
            chatKey={mode === 'lessons' ? (activeLessonId ?? 'sandbox') : 'sandbox'}
            provider={sessionPrefs?.provider ?? 'groq'}
            model={sessionPrefs?.model ?? 'llama-3.3-70b-versatile'}
            systemPrompt={buildSystemPrompt({
              lessonStepGoal: lessonRunner.currentStep?.instruction ?? lessonStepGoal,
              progress: lessonRunner.completedSteps
            })}
            tutorPayload={tutorPayload}
            introContext={mode === 'lessons' && activeLessonId && tutorialManager.activeTutorial ? {
              lessonTitle: lessonRunner.lesson?.title ?? '',
              lessonGoals: tutorialManager.activeTutorial.goals,
              currentStep: lessonRunner.currentStep?.instruction ?? undefined,
              completedOpenStep: pendingOpenStepContext ?? undefined,
            } : undefined}
            introEnabled={prefsLoaded && (mode !== 'lessons' ? true : lessonReady)}
            introTrigger={lessonIntroTrigger}
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
