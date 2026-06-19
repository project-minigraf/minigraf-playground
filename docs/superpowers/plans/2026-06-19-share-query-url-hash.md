# Share Query via URL Hash — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Share button to the query editor that encodes the editor content as a base64 URL hash, copies the URL to clipboard, and pre-populates the editor when that URL is opened.

**Architecture:** A pure `lib/share.ts` module provides encode/decode; `QueryEditor.tsx` adds the Share button using `encodeQuery`; `AppShell.tsx` reads the hash on mount, forces sandbox mode, clears the URL, and guards the prefs-restore effect with a ref so prefs don't override the hash-populated editor.

**Tech Stack:** Next.js 15 App Router, TypeScript, React, Tailwind CSS, built-in `btoa`/`atob` + `encodeURIComponent`/`decodeURIComponent`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/share.ts` | Create | Pure encode/decode functions |
| `__tests__/lib/share.test.ts` | Create | Unit tests for encode/decode |
| `components/editor/QueryEditor.tsx` | Modify | Add Share button + copy-to-clipboard |
| `components/layout/AppShell.tsx` | Modify | Read hash on mount, force sandbox, guard prefs effect |

---

## Task 1: `lib/share.ts` — encode/decode with TDD

**Files:**
- Create: `__tests__/lib/share.test.ts`
- Create: `lib/share.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/share.test.ts`:

```typescript
import { encodeQuery, decodeQuery } from '@/lib/share'

describe('encodeQuery / decodeQuery', () => {
  it('round-trips a simple query string', () => {
    const original = '?- friend(alice, ?x).\nfriend(alice, bob).'
    expect(decodeQuery(encodeQuery(original))).toBe(original)
  })

  it('round-trips a multiline query with special characters', () => {
    const original = '(transact [[:alice :friend :bob]])\n(query [:find ?x :where [:alice :friend ?x]])'
    expect(decodeQuery(encodeQuery(original))).toBe(original)
  })

  it('returns null for invalid base64', () => {
    expect(decodeQuery('!!!invalid')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeQuery('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="__tests__/lib/share"
```

Expected: FAIL — `Cannot find module '@/lib/share'`

- [ ] **Step 3: Implement `lib/share.ts`**

Create `lib/share.ts`:

```typescript
export function encodeQuery(query: string): string {
  return btoa(encodeURIComponent(query))
}

export function decodeQuery(encoded: string): string | null {
  if (!encoded) return null
  try {
    return decodeURIComponent(atob(encoded))
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="__tests__/lib/share"
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/share.ts __tests__/lib/share.test.ts
git commit -m "feat: add share encode/decode utilities"
```

---

## Task 2: Share button in `QueryEditor.tsx`

**Files:**
- Modify: `components/editor/QueryEditor.tsx`

- [ ] **Step 1: Add import and Share button logic**

Replace the contents of `components/editor/QueryEditor.tsx` with:

```tsx
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
  const { status, error: wasmError, query } = useMinigraf()
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

  function share() {
    const url = `${window.location.origin}${window.location.pathname}#q=${encodeQuery(value)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to `share.ts` or `QueryEditor.tsx`

- [ ] **Step 3: Verify manually in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Click Share — the button should briefly show "✓ Copied". Paste the clipboard — should be a URL ending in `#q=<base64>`.

- [ ] **Step 4: Commit**

```bash
git add components/editor/QueryEditor.tsx
git commit -m "feat: add Share button with copy-to-clipboard to QueryEditor"
```

---

## Task 3: Hash read on load in `AppShell.tsx`

**Files:**
- Modify: `components/layout/AppShell.tsx`

The hash effect must run on mount and force sandbox mode. The existing session-prefs `useEffect` restores saved mode from IndexedDB asynchronously — if it runs after the hash effect, it would override back to `'lessons'`. A `hashAppliedRef` guards against this.

- [ ] **Step 1: Add import and ref, then add hash effect before the prefs effect**

Make the following changes to `components/layout/AppShell.tsx`:

**1. Add import at the top** (after the existing imports):

```tsx
import { decodeQuery } from '@/lib/share'
```

**2. Add `hashAppliedRef` after the existing state declarations** (just before the `useEffect` for `isDesktop`, around line 54):

```tsx
const hashAppliedRef = useRef(false)
```

**3. Add the hash effect** immediately before the existing `getSessionPrefs` effect:

```tsx
// Read #q= hash on mount and pre-populate editor in sandbox mode
useEffect(() => {
  const hash = window.location.hash
  if (hash.startsWith('#q=')) {
    const decoded = decodeQuery(hash.slice(3))
    if (decoded) {
      setEditorValue(decoded)
      setMode('sandbox')
      history.replaceState(null, '', window.location.pathname)
      hashAppliedRef.current = true
    }
  }
}, [])
```

**4. Guard the existing prefs effect** — find the `getSessionPrefs().then(...)` call and wrap the mode-restore logic with the ref check. The full modified prefs effect looks like:

```tsx
useEffect(() => {
  getSessionPrefs().then((prefs) => {
    if (!hashAppliedRef.current) {
      if (prefs?.mode) {
        setMode(prefs.mode)
        if (prefs.mode === 'lessons' && prefs.activeLessonId) {
          setActiveLessonId(prefs.activeLessonId)
        } else if (prefs.mode === 'lessons') {
          setActiveLessonId('lesson-1')
        }
      }
    }
    setSessionPrefsState(prefs)
    setPrefsLoaded(true)
  })
}, [])
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all existing tests pass (no new tests required for this component change)

- [ ] **Step 3: Verify manually — sharing and loading**

```bash
npm run dev
```

1. Open `http://localhost:3000`
2. Type or edit something in the editor
3. Click Share — copy the URL from clipboard
4. Open a new tab and paste the URL
5. Expected: editor is pre-populated with the shared query, mode is sandbox, URL is clean (no `#q=` in address bar)

- [ ] **Step 4: Verify lessons mode is unaffected**

1. Switch to Lessons mode
2. Navigate away and back (to save prefs)
3. Reload `http://localhost:3000` (no hash)
4. Expected: app restores to Lessons mode as before

- [ ] **Step 5: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/layout/AppShell.tsx
git commit -m "feat: add share-query-via-URL-hash with copy-to-clipboard"
```

---

## Final Check

- [ ] Run the full test suite one last time:

```bash
npm test
```

Expected: all tests pass, including the 4 new tests in `__tests__/lib/share.test.ts`
