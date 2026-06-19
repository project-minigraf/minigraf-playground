# Error States and Loading Skeletons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WASM loading/error banner to `AppShell`, error-line highlighting to `QueryEditor`, and graceful IndexedDB fallbacks to `lib/storage.ts`.

**Architecture:** Three independent, self-contained changes. Storage fallbacks use a `safeGetDB()` helper that returns `null` on failure; all callers check for null and return typed defaults. The WASM banner is a conditional render driven by the already-available `status` value from `useMinigraf()`. The editor line highlight is a CodeMirror `StateField`/`StateEffect` extension driven by the existing `queryError` state.

**Tech Stack:** Next.js 15, TypeScript, CodeMirror 6 (`@codemirror/view`, `@codemirror/state`), `idb`, Jest + `fake-indexeddb`

---

## File Structure

| File | Change |
|---|---|
| `lib/storage.ts` | Add `safeGetDB()`, update all exported functions |
| `__tests__/lib/storage.test.ts` | Extend with IndexedDB-failure tests |
| `components/layout/AppShell.tsx` | Add WASM loading/error banner |
| `components/editor/QueryEditor.tsx` | Add CodeMirror error line decoration |
| `app/globals.css` | Add `.cm-error-line` rule |

---

## Task 1 — IndexedDB error fallbacks in `lib/storage.ts`

**Files:**
- Modify: `lib/storage.ts`
- Modify: `__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Open `__tests__/lib/storage.test.ts` and add a new `describe` block at the end. These tests mock `openDB` to throw and verify that each exported function degrades gracefully:

```typescript
import * as idb from 'idb'

describe('IndexedDB failure fallbacks', () => {
  let openDBSpy: jest.SpyInstance

  beforeEach(() => {
    openDBSpy = jest.spyOn(idb, 'openDB').mockRejectedValue(new Error('IDB unavailable'))
  })

  afterEach(() => {
    openDBSpy.mockRestore()
  })

  it('getGraphState returns null when DB is unavailable', async () => {
    expect(await getGraphState()).toBeNull()
  })

  it('getSessionPrefs returns null when DB is unavailable', async () => {
    expect(await getSessionPrefs()).toBeNull()
  })

  it('getApiKey returns null when DB is unavailable', async () => {
    expect(await getApiKey('groq')).toBeNull()
  })

  it('getLessonProgress returns null when DB is unavailable', async () => {
    expect(await getLessonProgress('lesson-1')).toBeNull()
  })

  it('getChatHistory returns [] when DB is unavailable', async () => {
    expect(await getChatHistory('sandbox')).toEqual([])
  })

  it('setGraphState resolves without throwing when DB is unavailable', async () => {
    await expect(setGraphState('test')).resolves.toBeUndefined()
  })

  it('setSessionPrefs resolves without throwing when DB is unavailable', async () => {
    await expect(setSessionPrefs({ provider: 'groq', model: 'llama-3.3-70b-versatile', mode: 'sandbox' })).resolves.toBeUndefined()
  })

  it('setChatHistory resolves without throwing when DB is unavailable', async () => {
    await expect(setChatHistory('sandbox', [])).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="storage" --no-coverage
```

Expected: 8 new tests FAIL with errors like `TypeError: Cannot read properties of null` or similar because `getDB()` currently throws uncaught.

- [ ] **Step 3: Implement `safeGetDB` and update all callers**

Replace `lib/storage.ts` with the following. The only structural change is: `getDB()` is kept as-is, a new `safeGetDB()` wraps it, and every exported function uses `safeGetDB()` with a null-check:

```typescript
import { openDB, type IDBPDatabase } from 'idb'
import type { Provider, SessionPrefs, ChatMessage } from './types'

const DB_NAME = 'minigraf-playground'
const DB_VERSION = 1

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('graph_state')
      db.createObjectStore('session_prefs')
      // API keys stored locally only — never sent to app servers
      db.createObjectStore('api_keys')
      db.createObjectStore('lesson_progress')
      db.createObjectStore('chat_history')
    },
  })
}

async function safeGetDB(): Promise<IDBPDatabase | null> {
  try { return await getDB() }
  catch (e) { console.warn('IndexedDB unavailable:', e); return null }
}

export async function getGraphState(): Promise<string | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('graph_state', 'current')) ?? null
}
export async function setGraphState(content: string): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('graph_state', content, 'current')
}

export async function getSessionPrefs(): Promise<SessionPrefs | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('session_prefs', 'prefs')) ?? null
}
export async function setSessionPrefs(prefs: SessionPrefs): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('session_prefs', prefs, 'prefs')
}

export async function getApiKey(provider: Provider): Promise<string | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('api_keys', provider)) ?? null
}
export async function setApiKey(provider: Provider, key: string): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('api_keys', key, provider)
}
export async function clearApiKey(provider: Provider): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.delete('api_keys', provider)
}

export async function getLessonProgress(lessonId: string): Promise<{ completedSteps: string[] } | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('lesson_progress', lessonId)) ?? null
}
export async function setLessonProgress(lessonId: string, completedSteps: string[]): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('lesson_progress', { completedSteps }, lessonId)
}

export async function getChatHistory(key: string): Promise<ChatMessage[]> {
  const db = await safeGetDB()
  if (!db) return []
  return (await db.get('chat_history', key)) ?? []
}
export async function setChatHistory(key: string, messages: ChatMessage[]): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('chat_history', messages, key)
}
export async function clearChatHistory(key: string): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('chat_history', [], key)
}
export async function clearAllChatHistory(): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  const tx = db.transaction('chat_history', 'readwrite')
  const store = tx.objectStore('chat_history')
  const keys = await store.getAllKeys()
  for (const key of keys) {
    await store.put([], key)
  }
  await tx.done
}
```

- [ ] **Step 4: Run all storage tests to verify they pass**

```bash
npm test -- --testPathPattern="storage" --no-coverage
```

Expected: All tests pass, including the 8 new fallback tests.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add IndexedDB error fallbacks to storage.ts"
```

---

## Task 2 — WASM loading/error banner in `AppShell.tsx`

**Files:**
- Modify: `components/layout/AppShell.tsx`

No new test file. This is a conditional render driven by `status` already in scope at line 117 of `AppShell.tsx`. Verify manually.

- [ ] **Step 1: Add the banners inside the left panel**

In `components/layout/AppShell.tsx`, find the left panel `<div>` (the one with `style={{ width: \`${leftWidthPct}%\` }}`). It currently starts with:

```tsx
{/* Editor */}
<div className="flex-1 overflow-hidden">
  <QueryEditor
```

Add the two conditional banners immediately before the `{/* Editor */}` comment:

```tsx
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
{/* Editor */}
<div className="flex-1 overflow-hidden">
  <QueryEditor
```

The `status` variable is already destructured from `useMinigraf()` at line 117 — no other changes needed.

- [ ] **Step 2: Run the full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests pass (no component tests for AppShell exist, so this just confirms no regressions).

- [ ] **Step 3: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000`. The WASM banner is only visible for the brief window while the WASM module loads. To verify the error state, temporarily break the WASM import: in `hooks/useMinigraf.ts`, find where the WASM module is initialised and force `status` to `'error'` for a moment, then revert. Alternatively, confirm the loading animation appears on first load (check DevTools Network tab for the WASM request).

- [ ] **Step 4: Commit**

```bash
git add components/layout/AppShell.tsx
git commit -m "feat: add WASM loading and error banners to AppShell"
```

---

## Task 3 — Query error line highlight in `QueryEditor.tsx`

**Files:**
- Modify: `components/editor/QueryEditor.tsx`
- Modify: `app/globals.css`

No new test file — CodeMirror's decoration internals are not meaningful to unit-test in jsdom. The line-number parser is a one-liner regex, verified manually.

- [ ] **Step 1: Add the CSS rule**

In `app/globals.css`, append after the closing `}` of the existing `@theme inline` block:

```css
.cm-error-line {
  background: rgba(239, 68, 68, 0.15);
}
```

- [ ] **Step 2: Add CodeMirror state machinery and view ref to `QueryEditor.tsx`**

Replace the entire contents of `components/editor/QueryEditor.tsx` with the following:

```tsx
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { datalogLanguage } from './datalog-lang'
import { useMinigraf } from '@/hooks/useMinigraf'
import type { QueryResult } from '@/lib/types'

// CodeMirror state machinery for error line highlighting
const addErrorLine = StateEffect.define<number>()   // 1-based line number
const clearErrorLine = StateEffect.define<null>()

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(clearErrorLine)) return Decoration.none
      if (e.is(addErrorLine)) {
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
  const { status, error: wasmError, query } = useMinigraf()
  const [queryError, setQueryError] = useState<string | null>(null)
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
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Verify the highlight in the browser**

```bash
npm run dev
```

Open `http://localhost:3000`. In the editor, type a deliberately broken query such as:

```
(query [:find ?x
        :where [:alice :friend ?y]])
  oops this is broken
```

Click Run. If Minigraf returns an error message containing `line N`, line N should gain a faint red background. Editing any character immediately clears the highlight.

- [ ] **Step 5: Verify the build is clean**

```bash
npm run build
```

Expected: Build completes without TypeScript or ESLint errors.

- [ ] **Step 6: Commit**

```bash
git add components/editor/QueryEditor.tsx app/globals.css
git commit -m "feat: add query error line highlight and CSS rule to QueryEditor"
```
