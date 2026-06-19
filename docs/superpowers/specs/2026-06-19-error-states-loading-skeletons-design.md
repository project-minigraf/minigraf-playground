# Design: Error States and Loading Skeletons (Issue #23)

**Date:** 2026-06-19  
**Milestone:** 5 — Polish  
**Scope:** `AppShell.tsx`, `QueryEditor.tsx`, `lib/storage.ts`

---

## Goal

Audit every async operation and ensure each has a proper loading, error, or empty state. Three targeted changes cover all gaps.

---

## 1. WASM Banner in `AppShell.tsx`

`AppShell` already calls `useMinigraf()` and has `status` in scope (line 117). No new hook calls or prop changes are needed.

Inside the left panel `<div>`, directly above the editor, render one of two conditional banners:

**Loading state** (`status === 'loading'`):
```tsx
<div className="px-3 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-500 animate-pulse">
  Loading Minigraf WASM…
</div>
```

**Error state** (`status === 'error'`):
```tsx
<div className="px-3 py-2 bg-red-950/40 border-b border-red-800 text-xs text-red-400 flex items-center justify-between">
  <span>Failed to load Minigraf WASM.</span>
  <button onClick={() => window.location.reload()} className="underline hover:text-red-200">Reload</button>
</div>
```

When `status === 'ready'`, neither banner renders.

---

## 2. Query Error Line Highlight in `QueryEditor.tsx`

### CodeMirror state machinery

Add two `StateEffect`s and one `StateField` to manage error line decoration:

```typescript
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'

const addErrorLine = StateEffect.define<number>()   // 1-based line number
const clearErrorLine = StateEffect.define<void>()

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
```

`errorLineField` is added to the `extensions` array on `<CodeMirror>`.

### View ref

Capture the CodeMirror `EditorView` instance via the existing `onCreateEditor` callback and store it in a `useRef<EditorView | null>(null)`.

### Effect dispatch

A `useEffect` on `queryError` drives highlight/clear:

```typescript
useEffect(() => {
  if (!viewRef.current) return
  if (queryError) {
    const match = /line (\d+)/i.exec(queryError)
    if (match) {
      viewRef.current.dispatch({ effects: addErrorLine.of(Number(match[1])) })
    }
  } else {
    viewRef.current.dispatch({ effects: clearErrorLine.of() })
  }
}, [queryError])
```

Since `queryError` is already set to `null` in `handleChange`, the highlight clears as soon as the user edits — no separate clear path needed.

### CSS

Add one rule to `app/globals.css`:

```css
.cm-error-line { background: rgba(239, 68, 68, 0.15); }
```

---

## 3. IndexedDB Error Fallbacks in `lib/storage.ts`

Replace all direct `getDB()` calls with a `safeGetDB()` helper:

```typescript
async function safeGetDB(): Promise<IDBPDatabase | null> {
  try { return await getDB() }
  catch (e) { console.warn('IndexedDB unavailable:', e); return null }
}
```

**Read functions** return their null/empty defaults when `db` is null:

| Function | Return on null db |
|---|---|
| `getGraphState` | `null` |
| `getSessionPrefs` | `null` |
| `getApiKey` | `null` |
| `getLessonProgress` | `null` |
| `getChatHistory` | `[]` |

**Write/delete functions** silently no-op when `db` is null:

- `setGraphState`, `setSessionPrefs`, `setApiKey`, `clearApiKey`
- `setLessonProgress`, `setChatHistory`, `clearChatHistory`, `clearAllChatHistory`

No callers change — return types are unchanged.

---

## Out of Scope

- `ResultsPanel.tsx` — already has error, empty, and results states; UX is unambiguous without changes
- `ChatPanel.tsx` — existing `⋯ animate-pulse` loading indicator is sufficient for the intro message load
- `hooks/useMinigraf.ts` — no changes needed; `status` and `error` are already exposed

---

## Acceptance Criteria

- [ ] WASM loading shows animated banner above editor
- [ ] WASM error shows reload button above editor
- [ ] Query errors highlight the offending line in the editor (if line number is parseable)
- [ ] Error line clears as soon as the user edits
- [ ] IndexedDB failure does not crash the app — graceful null/empty defaults returned
- [ ] `npm test` passes
- [ ] `npm run build` passes
