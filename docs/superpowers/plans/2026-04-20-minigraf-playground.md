# Minigraf Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based interactive Minigraf playground with an AI tutor, running Minigraf WASM in the browser, hosted on Vercel.

**Architecture:** Next.js 15 App Router with a split-pane UI (CodeMirror editor + results panel on left, AI chat on right). Minigraf WASM vendored at build time via postinstall script. AI tutor proxies to user's chosen LLM (BYOK) or falls back to Groq. All user data stored in IndexedDB — nothing ever sent to app servers.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Vercel AI SDK (`ai`, `@ai-sdk/groq`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/xai`), CodeMirror 6, React Flow, `idb` (IndexedDB wrapper), `fake-indexeddb` (tests), Jest + React Testing Library

---

## Shared Types

These types are used across multiple tasks. Establish them in `lib/types.ts` during Task 1.5.

```typescript
// lib/types.ts
export type Provider = 'gemini' | 'anthropic' | 'openai' | 'xai'

export type QueryResult = {
  columns: string[]
  rows: string[][]
  executionTimeMs: number
}

export type SessionPrefs = {
  provider: Provider
  model: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type LessonStep = {
  id: string
  instruction: string        // markdown
  starterCode: string
  expectedResult?: { columns: string[]; rows: string[][] }
  hints: string[]
  successMessage: string
}

export type Lesson = {
  id: string
  title: string
  description: string
  steps: LessonStep[]
}

export type TutorDiff = {
  missing: string[][]
  unexpected: string[][]
}
```

---

## File Structure

```
minigraf-playground/
├── app/
│   ├── layout.tsx                  # Root layout; mounts PrivacyModal
│   ├── page.tsx                    # Main playground page
│   ├── terms/page.tsx              # Static T&C page
│   └── api/chat/route.ts           # LLM proxy edge function (streaming)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx            # Split-pane: left 2/3, right 1/3
│   │   ├── NavBar.tsx              # Logo + mode toggle + settings icon
│   │   └── ResizeHandle.tsx        # Drag-to-resize between panels
│   ├── editor/
│   │   ├── QueryEditor.tsx         # CodeMirror 6 wrapper + Run button
│   │   └── datalog-lang.ts         # CodeMirror Datalog language support
│   ├── results/
│   │   ├── ResultsPanel.tsx        # Hosts table + graph toggle
│   │   ├── ResultsTable.tsx        # Sortable tuple table
│   │   └── ResultsGraph.tsx        # React Flow force-directed graph
│   ├── chat/
│   │   ├── ChatPanel.tsx           # Streaming chat UI + input
│   │   └── AnonCapBanner.tsx       # Shown when anon quota exhausted
│   ├── lessons/
│   │   ├── LessonSidebar.tsx       # Collapsible lesson list + progress
│   │   └── LessonStepView.tsx      # Current step instruction (markdown)
│   ├── settings/
│   │   └── SettingsDrawer.tsx      # Provider + model + API key input
│   └── modals/
│       └── PrivacyModal.tsx        # First-visit privacy + T&C modal
├── hooks/
│   ├── useMinigraf.ts              # WASM singleton loader + query()
│   └── useLesson.ts                # Lesson runner state machine
├── lib/
│   ├── types.ts                    # Shared TypeScript types (see above)
│   ├── storage.ts                  # Typed IndexedDB wrapper (uses idb)
│   ├── tutor.ts                    # validate → diff → narrate logic
│   ├── system-prompt.ts            # Dynamic system prompt builder
│   └── lessons/
│       ├── schema.ts               # Re-exports types from lib/types.ts
│       ├── index.ts                # Ordered lesson array export
│       ├── lesson-1.ts             # Basic facts and queries
│       ├── lesson-2.ts             # Rules and inference
│       ├── lesson-3.ts             # Recursive rules
│       └── lesson-4.ts             # Bi-temporal time travel
├── scripts/
│   └── download-wasm.sh            # Fetches + unpacks WASM tarball
├── public/wasm/                    # Gitignored; populated by postinstall
├── wasm.config.json                # Pinned WASM version
├── vercel.json
├── .env.example
└── jest.config.ts
```

---

## Task 1.1 — Scaffold Next.js App

**Files:**
- Create: entire project scaffold
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Scaffold**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --no-src-dir \
  --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install idb @codemirror/state @codemirror/view @codemirror/lang-javascript \
  @uiw/react-codemirror reactflow ai @ai-sdk/groq @ai-sdk/anthropic \
  @ai-sdk/openai @ai-sdk/google @ai-sdk/xai react-markdown

npm install --save-dev fake-indexeddb @testing-library/react \
  @testing-library/jest-dom @types/jest jest jest-environment-jsdom ts-jest
```

- [ ] **Step 3: Create `jest.config.ts`**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}

export default createJestConfig(config)
```

- [ ] **Step 4: Create `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
```

- [ ] **Step 5: Add test script to `package.json`**

Add `"test": "jest"` and `"test:watch": "jest --watch"` to scripts.

- [ ] **Step 6: Verify scaffold builds**

```bash
npm run build
```

Expected: successful build with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with Tailwind, Jest, and dependencies"
```

---

## Task 1.2 — Configure Vercel Deployment

**Files:**
- Create: `vercel.json`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 30
    }
  }
}
```

- [ ] **Step 2: Create `.env.example`**

```bash
# Groq API key — required for anonymous fallback LLM
GROQ_API_KEY=

# Secret for signing the anon-fallback session cookie (generate with: openssl rand -hex 32)
COOKIE_SECRET=

# Public URL of the deployed app (e.g. https://minigraf-playground.vercel.app)
NEXT_PUBLIC_APP_URL=

# Optional: per-session token cap for anonymous fallback (default: 10000)
ANON_FALLBACK_TOKEN_CAP=10000
```

- [ ] **Step 3: Update `README.md`** with deploy instructions:

```markdown
## Deploy to Vercel

1. Fork this repo and import it in [Vercel](https://vercel.com/new).
2. Set the following environment variables in the Vercel dashboard:
   - `GROQ_API_KEY` — get one free at https://console.groq.com
   - `COOKIE_SECRET` — run `openssl rand -hex 32` locally
   - `NEXT_PUBLIC_APP_URL` — your Vercel deployment URL
3. Deploy. The `postinstall` script automatically downloads the Minigraf WASM binary.
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example README.md
git commit -m "feat: add Vercel deployment config and env var documentation"
```

---

## Task 1.3 — Download and Vendor Minigraf WASM

**Files:**
- Create: `scripts/download-wasm.sh`
- Create: `wasm.config.json`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Create `wasm.config.json`**

```json
{
  "version": "0.21.1",
  "url": "https://github.com/adityamukho/minigraf/releases/download/v0.21.1/minigraf-browser-wasm.tar.gz",
  "outputDir": "public/wasm"
}
```

- [ ] **Step 2: Create `scripts/download-wasm.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

CONFIG=$(cat wasm.config.json)
URL=$(echo "$CONFIG" | grep -o '"url": "[^"]*"' | cut -d'"' -f4)
OUT=$(echo "$CONFIG" | grep -o '"outputDir": "[^"]*"' | cut -d'"' -f4)

echo "Downloading Minigraf WASM from $URL..."
mkdir -p "$OUT"
curl -fsSL "$URL" | tar -xz -C "$OUT"
echo "WASM extracted to $OUT/"

echo "--- WASM API surface (.d.ts) ---"
cat "$OUT"/*.d.ts 2>/dev/null || echo "No .d.ts found — check tarball contents"
```

```bash
chmod +x scripts/download-wasm.sh
```

- [ ] **Step 3: Wire into `package.json` as postinstall**

Add to `scripts`:
```json
"postinstall": "bash scripts/download-wasm.sh"
```

- [ ] **Step 4: Add `public/wasm/` to `.gitignore`**

```
public/wasm/
```

- [ ] **Step 5: Run and inspect the API**

```bash
npm run postinstall
```

Read the `.d.ts` output printed to the console. **Document the actual exported function/class names in a comment at the top of `hooks/useMinigraf.ts` in Task 1.4.** The hook implementation must match the real API — do not invent names.

- [ ] **Step 6: Commit**

```bash
git add scripts/download-wasm.sh wasm.config.json package.json .gitignore
git commit -m "feat: add postinstall script to download and vendor Minigraf WASM"
```

---

## Task 1.4 — WASM Loader Hook

**Files:**
- Create: `hooks/useMinigraf.ts`
- Create: `lib/types.ts`

> **Prerequisite:** Run Task 1.3 first and check the `.d.ts` file in `public/wasm/` to confirm the actual exported API before writing this hook.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/hooks/useMinigraf.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useMinigraf } from '@/hooks/useMinigraf'

// Mock the WASM module — replace with real module path from .d.ts inspection
jest.mock('@/public/wasm/minigraf', () => ({
  default: jest.fn().mockResolvedValue(undefined),
  MiniGraf: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockReturnValue(
      JSON.stringify({ columns: ['?x'], rows: [['bob']], executionTimeMs: 1 })
    ),
  })),
}), { virtual: true })

it('transitions from loading to ready', async () => {
  const { result } = renderHook(() => useMinigraf())
  expect(result.current.status).toBe('loading')
  await waitFor(() => expect(result.current.status).toBe('ready'))
})

it('returns query results', async () => {
  const { result } = renderHook(() => useMinigraf())
  await waitFor(() => expect(result.current.status).toBe('ready'))
  const qr = await result.current.query('?- friend(alice, ?x).')
  expect(qr.columns).toEqual(['?x'])
  expect(qr.rows).toEqual([['bob']])
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=useMinigraf
```

- [ ] **Step 3: Create `lib/types.ts`** with the shared types block shown in the Shared Types section above.

- [ ] **Step 4: Implement `hooks/useMinigraf.ts`**

```typescript
// hooks/useMinigraf.ts
// WASM API (from public/wasm/*.d.ts inspection in Task 1.3):
// - default export: init() — call once to load WASM
// - MiniGraf class: constructor(), query(datalog: string): string (JSON)
// Adjust import path and method names if the .d.ts differs.

'use client'

import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'

type Status = 'loading' | 'ready' | 'error'

let instancePromise: Promise<unknown> | null = null

function getOrCreateInstance() {
  if (!instancePromise) {
    instancePromise = (async () => {
      const mod = await import('/wasm/minigraf.js' as string)
      await mod.default()
      return new mod.MiniGraf()
    })()
  }
  return instancePromise
}

export function useMinigraf() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<unknown>(null)

  useEffect(() => {
    getOrCreateInstance()
      .then((inst) => {
        instanceRef.current = inst
        setStatus('ready')
      })
      .catch((err) => {
        setError(String(err))
        setStatus('error')
      })
  }, [])

  async function query(datalog: string): Promise<QueryResult> {
    if (!instanceRef.current) throw new Error('Minigraf not ready')
    const inst = instanceRef.current as { query: (q: string) => string }
    const raw = inst.query(datalog)
    const parsed = JSON.parse(raw)
    return {
      columns: parsed.columns ?? [],
      rows: parsed.rows ?? [],
      executionTimeMs: parsed.executionTimeMs ?? 0,
    }
  }

  return { status, error, query }
}
```

> **Note:** The `import('/wasm/minigraf.js')` path assumes wasm-pack output with that filename. Adjust based on actual `.d.ts` findings. If the WASM module uses a different init pattern (e.g., `initSync`), update accordingly.

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- --testPathPattern=useMinigraf
```

- [ ] **Step 6: Commit**

```bash
git add hooks/useMinigraf.ts lib/types.ts __tests__/hooks/useMinigraf.test.ts
git commit -m "feat: add WASM loader hook with singleton pattern"
```

---

## Task 1.5 — IndexedDB Persistence Layer

**Files:**
- Create: `lib/storage.ts`
- Create: `__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/storage.test.ts
import {
  getGraphState, setGraphState,
  getSessionPrefs, setSessionPrefs,
  getApiKey, setApiKey, clearApiKey,
  getLessonProgress, setLessonProgress,
  getChatHistory, setChatHistory, clearChatHistory,
} from '@/lib/storage'

describe('graph_state', () => {
  it('returns null when empty', async () => {
    expect(await getGraphState()).toBeNull()
  })
  it('stores and retrieves content', async () => {
    await setGraphState('friend(alice, bob).')
    expect(await getGraphState()).toBe('friend(alice, bob).')
  })
})

describe('session_prefs', () => {
  it('stores and retrieves prefs', async () => {
    await setSessionPrefs({ provider: 'anthropic', model: 'claude-sonnet-4-6' })
    const prefs = await getSessionPrefs()
    expect(prefs?.provider).toBe('anthropic')
  })
})

describe('api_keys', () => {
  it('stores, retrieves, and clears a key', async () => {
    await setApiKey('anthropic', 'sk-test-123')
    expect(await getApiKey('anthropic')).toBe('sk-test-123')
    await clearApiKey('anthropic')
    expect(await getApiKey('anthropic')).toBeNull()
  })
})

describe('lesson_progress', () => {
  it('tracks completed steps', async () => {
    await setLessonProgress('lesson-1', ['step-1', 'step-2'])
    const p = await getLessonProgress('lesson-1')
    expect(p?.completedSteps).toEqual(['step-1', 'step-2'])
  })
})

describe('chat_history', () => {
  it('stores and retrieves messages', async () => {
    const msgs = [{ role: 'user' as const, content: 'hello', timestamp: 1 }]
    await setChatHistory('sandbox', msgs)
    const h = await getChatHistory('sandbox')
    expect(h).toHaveLength(1)
    expect(h[0].content).toBe('hello')
  })
  it('clears history', async () => {
    await clearChatHistory('sandbox')
    expect(await getChatHistory('sandbox')).toEqual([])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --testPathPattern=storage
```

- [ ] **Step 3: Implement `lib/storage.ts`**

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
      db.createObjectStore('api_keys')
      db.createObjectStore('lesson_progress')
      db.createObjectStore('chat_history')
    },
  })
}

export async function getGraphState(): Promise<string | null> {
  const db = await getDB()
  return (await db.get('graph_state', 'current')) ?? null
}
export async function setGraphState(content: string): Promise<void> {
  const db = await getDB()
  await db.put('graph_state', content, 'current')
}

export async function getSessionPrefs(): Promise<SessionPrefs | null> {
  const db = await getDB()
  return (await db.get('session_prefs', 'prefs')) ?? null
}
export async function setSessionPrefs(prefs: SessionPrefs): Promise<void> {
  const db = await getDB()
  await db.put('session_prefs', prefs, 'prefs')
}

// API keys — stored locally only, never sent to app servers
export async function getApiKey(provider: Provider): Promise<string | null> {
  const db = await getDB()
  return (await db.get('api_keys', provider)) ?? null
}
export async function setApiKey(provider: Provider, key: string): Promise<void> {
  const db = await getDB()
  await db.put('api_keys', key, provider)
}
export async function clearApiKey(provider: Provider): Promise<void> {
  const db = await getDB()
  await db.delete('api_keys', provider)
}

export async function getLessonProgress(lessonId: string): Promise<{ completedSteps: string[] } | null> {
  const db = await getDB()
  return (await db.get('lesson_progress', lessonId)) ?? null
}
export async function setLessonProgress(lessonId: string, completedSteps: string[]): Promise<void> {
  const db = await getDB()
  await db.put('lesson_progress', { completedSteps }, lessonId)
}

export async function getChatHistory(key: string): Promise<ChatMessage[]> {
  const db = await getDB()
  return (await db.get('chat_history', key)) ?? []
}
export async function setChatHistory(key: string, messages: ChatMessage[]): Promise<void> {
  const db = await getDB()
  await db.put('chat_history', messages, key)
}
export async function clearChatHistory(key: string): Promise<void> {
  const db = await getDB()
  await db.put('chat_history', [], key)
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- --testPathPattern=storage
```

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add typed IndexedDB persistence layer"
```

---

## Task 1.6 — First-Visit Privacy + T&C Modal

**Files:**
- Create: `components/modals/PrivacyModal.tsx`
- Create: `app/terms/page.tsx` (placeholder)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/modals/PrivacyModal.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'privacy-accepted'

export function PrivacyModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl p-6 space-y-4 text-sm text-gray-300">
        <h2 className="text-lg font-semibold text-white">Before you start</h2>
        <p>
          <strong className="text-white">Your API keys stay in your browser.</strong>{' '}
          They are stored in IndexedDB and are never sent to our servers.
        </p>
        <p>
          When you use AI features, your queries and chat messages are sent to the
          third-party LLM provider you choose (e.g. Anthropic, OpenAI, Google, xAI,
          or Groq). Each provider processes this data under their own privacy policy.
        </p>
        <p>
          By continuing you acknowledge this. Read our{' '}
          <a href="/terms" className="text-blue-400 underline" target="_blank">
            Terms &amp; Conditions
          </a>{' '}
          for full details.
        </p>
        <button
          onClick={accept}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium transition-colors"
        >
          I understand — let me in
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/terms/page.tsx`** (placeholder — fleshed out in Task 5.4)

```tsx
export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 px-4 text-gray-300">
      <h1 className="text-2xl font-bold text-white mb-4">Terms &amp; Conditions</h1>
      <p className="text-gray-500 italic">Full terms coming soon.</p>
    </main>
  )
}
```

- [ ] **Step 3: Mount modal in `app/layout.tsx`**

Add `<PrivacyModal />` inside the `<body>` after the `{children}` render. Import from `@/components/modals/PrivacyModal`.

- [ ] **Step 4: Commit**

```bash
git add components/modals/PrivacyModal.tsx app/terms/page.tsx app/layout.tsx
git commit -m "feat: add first-visit privacy modal and T&C placeholder page"
```

---

## Task 2.1 — Split-Pane Layout Shell

**Files:**
- Create: `components/layout/AppShell.tsx`
- Create: `components/layout/NavBar.tsx`
- Create: `components/layout/ResizeHandle.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/layout/NavBar.tsx`**

```tsx
'use client'
import { Settings } from 'lucide-react'

type Mode = 'sandbox' | 'lessons'

interface NavBarProps {
  mode: Mode
  onModeChange: (m: Mode) => void
  onSettingsOpen: () => void
}

export function NavBar({ mode, onModeChange, onSettingsOpen }: NavBarProps) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-950 shrink-0">
      <span className="font-bold text-white tracking-tight">Minigraf Playground</span>
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm">
          {(['sandbox', 'lessons'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1 capitalize transition-colors ${
                mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button onClick={onSettingsOpen} className="text-gray-400 hover:text-white transition-colors">
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create `components/layout/ResizeHandle.tsx`**

```tsx
'use client'
import { useCallback, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (deltaX: number) => void
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onResize(ev.clientX - lastX.current)
      lastX.current = ev.clientX
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp, { once: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 cursor-col-resize bg-gray-800 hover:bg-blue-600 transition-colors shrink-0"
    />
  )
}
```

- [ ] **Step 3: Create `components/layout/AppShell.tsx`**

```tsx
'use client'
import { useState, useCallback } from 'react'
import { NavBar } from './NavBar'
import { ResizeHandle } from './ResizeHandle'
import type { SessionPrefs } from '@/lib/types'

type Mode = 'sandbox' | 'lessons'

export function AppShell() {
  const [mode, setMode] = useState<Mode>('sandbox')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(66)

  const handleResize = useCallback((delta: number) => {
    setLeftWidthPct((prev) => Math.min(80, Math.max(40, prev + (delta / window.innerWidth) * 100)))
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <NavBar mode={mode} onModeChange={setMode} onSettingsOpen={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: editor (top) + results (bottom) */}
        <div style={{ width: `${leftWidthPct}%` }} className="flex flex-col overflow-hidden">
          <div className="flex-1 border-b border-gray-800 p-4 flex items-center justify-center text-gray-600">
            Editor panel — Task 2.2
          </div>
          <div className="flex-1 p-4 flex items-center justify-center text-gray-600">
            Results panel — Task 2.3
          </div>
        </div>
        <ResizeHandle onResize={handleResize} />
        {/* Right panel: chat */}
        <div className="flex-1 p-4 flex items-center justify-center text-gray-600">
          Chat panel — Task 3.3
        </div>
      </div>
      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-end p-4">
          <div className="bg-gray-900 rounded-xl p-4 text-gray-400 text-sm">
            Settings drawer — Task 3.1
            <button onClick={() => setSettingsOpen(false)} className="ml-4 text-blue-400">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Mount in `app/page.tsx`**

```tsx
import { AppShell } from '@/components/layout/AppShell'

export default function Page() {
  return <AppShell />
}
```

- [ ] **Step 5: Verify in browser** — `npm run dev`, confirm split-pane renders and drag handle works.

- [ ] **Step 6: Commit**

```bash
git add components/layout/ app/page.tsx
git commit -m "feat: add split-pane layout shell with resizable panels and nav bar"
```

---

## Task 2.2 — Integrate CodeMirror 6 Editor

**Files:**
- Create: `components/editor/datalog-lang.ts`
- Create: `components/editor/QueryEditor.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Create `components/editor/datalog-lang.ts`**

```typescript
import { StreamLanguage } from '@codemirror/language'

// Minimal Datalog tokenizer: keywords, variables (?x), atoms, comments
export const datalogLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.match(/^%.*$/)) return 'comment'
    if (stream.match(/^\?[a-zA-Z_][a-zA-Z0-9_]*/)) return 'variableName'
    if (stream.match(/^:-/)) return 'keyword'
    if (stream.match(/^\?-/)) return 'keyword'
    if (stream.match(/^[a-z][a-zA-Z0-9_]*/)) return 'atom'
    stream.next()
    return null
  },
})
```

- [ ] **Step 2: Create `components/editor/QueryEditor.tsx`**

```tsx
'use client'
import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { datalogLanguage } from './datalog-lang'
import type { QueryResult } from '@/lib/types'
import { useMinigraf } from '@/hooks/useMinigraf'

interface QueryEditorProps {
  value: string
  onChange: (v: string) => void
  onResult: (r: QueryResult) => void
  onError: (e: string) => void
}

export function QueryEditor({ value, onChange, onResult, onError }: QueryEditorProps) {
  const { status, query } = useMinigraf()

  const run = useCallback(async () => {
    try {
      const result = await query(value)
      onResult(result)
    } catch (e) {
      onError(String(e))
    }
  }, [value, query, onResult, onError])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs uppercase tracking-widest text-gray-500">Editor</span>
        <button
          onClick={run}
          disabled={status !== 'ready'}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm rounded-md transition-colors"
        >
          ▶ Run
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={[datalogLanguage]}
          theme="dark"
          className="h-full text-sm"
        />
      </div>
      {status === 'error' && (
        <div className="px-3 py-2 text-xs text-red-400 border-t border-red-900 bg-red-950/30">
          WASM failed to load. Try refreshing.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire into `AppShell.tsx`**

Replace the editor placeholder div with:
```tsx
import { QueryEditor } from '@/components/editor/QueryEditor'
// ...
const [editorValue, setEditorValue] = useState('')
const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
const [queryError, setQueryError] = useState<string | null>(null)
// ...
<QueryEditor
  value={editorValue}
  onChange={setEditorValue}
  onResult={(r) => { setQueryResult(r); setQueryError(null) }}
  onError={(e) => { setQueryError(e); setQueryResult(null) }}
/>
```

- [ ] **Step 4: Verify in browser** — editor renders, Run button activates when WASM loads, errors shown inline.

- [ ] **Step 5: Commit**

```bash
git add components/editor/ components/layout/AppShell.tsx
git commit -m "feat: integrate CodeMirror 6 editor with Datalog highlighting and Run button"
```

---

## Task 2.3 — Results Table Panel

**Files:**
- Create: `components/results/ResultsTable.tsx`
- Create: `components/results/ResultsPanel.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Create `components/results/ResultsTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { QueryResult } from '@/lib/types'

interface ResultsTableProps { result: QueryResult }

export function ResultsTable({ result }: ResultsTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const rows = sortCol === null ? result.rows : [...result.rows].sort((a, b) => {
    const cmp = (a[sortCol] ?? '').localeCompare(b[sortCol] ?? '')
    return sortAsc ? cmp : -cmp
  })

  const toggleSort = (i: number) => {
    if (sortCol === i) setSortAsc((p) => !p)
    else { setSortCol(i); setSortAsc(true) }
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-900">
          <tr>
            {result.columns.map((col, i) => (
              <th
                key={col}
                onClick={() => toggleSort(i)}
                className="text-left px-3 py-2 border-b border-gray-700 text-gray-400 cursor-pointer hover:text-white select-none"
              >
                {col} {sortCol === i ? (sortAsc ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-800 hover:bg-gray-800/40">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 font-mono text-green-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/results/ResultsPanel.tsx`** (graph toggle is a stub here; wired fully in Task 2.4)

```tsx
'use client'
import type { QueryResult } from '@/lib/types'
import { ResultsTable } from './ResultsTable'

interface ResultsPanelProps {
  result: QueryResult | null
  error: string | null
}

export function ResultsPanel({ result, error }: ResultsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs uppercase tracking-widest text-gray-500">Results</span>
        {result && (
          <span className="text-xs text-gray-600">{result.rows.length} rows · {result.executionTimeMs}ms</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-3 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}
        {!error && !result && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Run a query to see results.
          </div>
        )}
        {!error && result && <ResultsTable result={result} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire into `AppShell.tsx`** — replace results placeholder div with:

```tsx
import { ResultsPanel } from '@/components/results/ResultsPanel'
// ...
<ResultsPanel result={queryResult} error={queryError} />
```

- [ ] **Step 4: Commit**

```bash
git add components/results/ResultsTable.tsx components/results/ResultsPanel.tsx components/layout/AppShell.tsx
git commit -m "feat: add results table panel with sortable columns and error/empty states"
```

---

## Task 2.4 — Graph Visualization Toggle

**Files:**
- Create: `components/results/ResultsGraph.tsx`
- Modify: `components/results/ResultsPanel.tsx`

- [ ] **Step 1: Create `components/results/ResultsGraph.tsx`**

```tsx
'use client'
import { useMemo } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import type { QueryResult } from '@/lib/types'

interface ResultsGraphProps { result: QueryResult }

export function ResultsGraph({ result }: ResultsGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodeSet = new Set<string>()
    result.rows.forEach(([src, tgt]) => { nodeSet.add(src); nodeSet.add(tgt) })
    const nodeArr = Array.from(nodeSet)
    const nodes = nodeArr.map((id, i) => ({
      id,
      data: { label: id },
      position: { x: (i % 5) * 150, y: Math.floor(i / 5) * 100 },
      style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' },
    }))
    const edges = result.rows.map(([src, tgt], i) => ({
      id: `e${i}`,
      source: src,
      target: tgt,
      style: { stroke: '#4ade80' },
    }))
    return { nodes, edges }
  }, [result])

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#1e293b" />
        <Controls />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 2: Update `components/results/ResultsPanel.tsx`** to add the toggle:

```tsx
'use client'
import { useState } from 'react'
import type { QueryResult } from '@/lib/types'
import { ResultsTable } from './ResultsTable'
import { ResultsGraph } from './ResultsGraph'

interface ResultsPanelProps { result: QueryResult | null; error: string | null }

export function ResultsPanel({ result, error }: ResultsPanelProps) {
  const [showGraph, setShowGraph] = useState(false)
  const canGraph = result !== null && result.columns.length === 2

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs uppercase tracking-widest text-gray-500">Results</span>
        <div className="flex items-center gap-3">
          {result && <span className="text-xs text-gray-600">{result.rows.length} rows · {result.executionTimeMs}ms</span>}
          <button
            onClick={() => setShowGraph((p) => !p)}
            disabled={!canGraph}
            title={canGraph ? 'Toggle graph view' : 'Graph requires exactly 2 columns'}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              showGraph ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white disabled:opacity-30'
            }`}
          >
            ⬡ Graph
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {error && <div className="m-3 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-400 text-sm font-mono">{error}</div>}
        {!error && !result && <div className="flex items-center justify-center h-full text-gray-600 text-sm">Run a query to see results.</div>}
        {!error && result && (showGraph && canGraph ? <ResultsGraph result={result} /> : <ResultsTable result={result} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/results/ResultsGraph.tsx components/results/ResultsPanel.tsx
git commit -m "feat: add React Flow graph visualization toggle to results panel"
```

---

## Task 2.5 — Lessons / Sandbox Mode Switcher

**Files:**
- Create: `components/lessons/LessonSidebar.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Create `components/lessons/LessonSidebar.tsx`** (placeholder; wired to lesson runner in Task 4.2)

```tsx
'use client'
import { useState } from 'react'

const PLACEHOLDER_LESSONS = [
  { id: 'lesson-1', title: 'Basic facts and queries', locked: false },
  { id: 'lesson-2', title: 'Rules and inference', locked: true },
  { id: 'lesson-3', title: 'Recursive rules', locked: true },
  { id: 'lesson-4', title: 'Bi-temporal time travel', locked: true },
]

interface LessonSidebarProps {
  activeLessonId: string | null
  onSelect: (id: string) => void
}

export function LessonSidebar({ activeLessonId, onSelect }: LessonSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="w-6 border-r border-gray-800 flex items-start pt-3 justify-center cursor-pointer" onClick={() => setCollapsed(false)}>
        <span className="text-gray-600 text-xs rotate-90 whitespace-nowrap">Lessons ▶</span>
      </div>
    )
  }

  return (
    <div className="w-52 border-r border-gray-800 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs uppercase tracking-widest text-gray-500">Lessons</span>
        <button onClick={() => setCollapsed(true)} className="text-gray-600 hover:text-white text-xs">◀</button>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {PLACEHOLDER_LESSONS.map((l) => (
          <li key={l.id}>
            <button
              onClick={() => !l.locked && onSelect(l.id)}
              disabled={l.locked}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                activeLessonId === l.id ? 'bg-blue-900/40 text-blue-300' : 'text-gray-400 hover:text-white disabled:opacity-40'
              }`}
            >
              {l.locked ? '🔒 ' : ''}{l.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Update `AppShell.tsx`** to show lesson sidebar in lessons mode:

```tsx
import { LessonSidebar } from '@/components/lessons/LessonSidebar'
// In AppShell state:
const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
// Persist mode changes to IndexedDB session_prefs (import setSessionPrefs)
// Inside the flex row, before the left panel, add conditionally:
{mode === 'lessons' && (
  <LessonSidebar activeLessonId={activeLessonId} onSelect={setActiveLessonId} />
)}
```

- [ ] **Step 3: Persist mode preference** — on `onModeChange`, call `setSessionPrefs({ provider: ..., model: ..., mode })`. Add `mode` field to `SessionPrefs` type in `lib/types.ts` and update `lib/storage.ts` accordingly.

- [ ] **Step 4: Commit**

```bash
git add components/lessons/LessonSidebar.tsx components/layout/AppShell.tsx lib/types.ts lib/storage.ts
git commit -m "feat: add Lessons/Sandbox mode switcher with collapsible lesson sidebar"
```

---

## Task 3.1 — Provider Selector + BYOK Settings Panel

**Files:**
- Create: `components/settings/SettingsDrawer.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Create `components/settings/SettingsDrawer.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { Provider } from '@/lib/types'
import { getApiKey, setApiKey, clearApiKey, getSessionPrefs, setSessionPrefs } from '@/lib/storage'
import { X } from 'lucide-react'

const PROVIDERS: { id: Provider; label: string; models: string[] }[] = [
  { id: 'gemini', label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
  { id: 'anthropic', label: 'Anthropic Claude', models: ['claude-haiku-4-5', 'claude-sonnet-4-6'] },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1'] },
  { id: 'xai', label: 'xAI Grok', models: ['grok-3-mini', 'grok-3'] },
]

interface SettingsDrawerProps { onClose: () => void }

export function SettingsDrawer({ onClose }: SettingsDrawerProps) {
  const [provider, setProvider] = useState<Provider>('gemini')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [key, setKey] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')

  useEffect(() => {
    getSessionPrefs().then((p) => { if (p) { setProvider(p.provider); setModel(p.model) } })
    getApiKey(provider).then((k) => setKey(k ?? ''))
  }, [provider])

  async function save() {
    await setApiKey(provider, key)
    await setSessionPrefs({ provider, model })
    onClose()
  }

  async function testConnection() {
    setTestStatus('testing')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], userKey: key, provider, model, test: true }),
      })
      setTestStatus(res.ok ? 'ok' : 'fail')
    } catch { setTestStatus('fail') }
  }

  const models = PROVIDERS.find((p) => p.id === provider)?.models ?? []

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold text-white">AI Tutor Settings</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-blue-950/40 border border-blue-800 rounded-lg p-3 text-xs text-blue-300">
          Your API key is stored only in this browser. It is never sent to our servers.
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">API Key</label>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your API key"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono" />
        </div>
        <div className="flex gap-2">
          <button onClick={testConnection} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg text-white transition-colors">
            {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? '✓ Connected' : testStatus === 'fail' ? '✗ Failed' : 'Test Connection'}
          </button>
          <button onClick={() => { clearApiKey(provider); setKey('') }}
            className="py-1.5 px-3 text-sm text-gray-400 hover:text-red-400 transition-colors">
            Clear
          </button>
        </div>
      </div>
      <div className="p-4 border-t border-gray-800">
        <button onClick={save} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          Save & Close
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace settings placeholder in `AppShell.tsx`** with `<SettingsDrawer onClose={() => setSettingsOpen(false)} />` when `settingsOpen` is true.

- [ ] **Step 3: Commit**

```bash
git add components/settings/SettingsDrawer.tsx components/layout/AppShell.tsx
git commit -m "feat: add BYOK settings drawer with provider/model selector and key storage"
```

---

## Task 3.2 — Anonymous Fallback + Server-Side Proxy Route

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Install `jose` for cookie signing**

```bash
npm install jose
```

- [ ] **Step 2: Create `app/api/chat/route.ts`**

```typescript
import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const TOKEN_CAP = parseInt(process.env.ANON_FALLBACK_TOKEN_CAP ?? '10000')
const COOKIE_NAME = 'anon-tokens'
const secret = new TextEncoder().encode(process.env.COOKIE_SECRET ?? 'dev-secret-change-me')

async function getUsedTokens(req: NextRequest): Promise<number> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (!cookie) return 0
  try {
    const { payload } = await jwtVerify(cookie, secret)
    return (payload.used as number) ?? 0
  } catch { return 0 }
}

async function makeTokenCookie(used: number): Promise<string> {
  const token = await new SignJWT({ used })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`
}

function getProvider(provider: string, model: string, userKey?: string) {
  const key = userKey || undefined
  switch (provider) {
    case 'anthropic': return createAnthropic({ apiKey: key })(model)
    case 'openai': return createOpenAI({ apiKey: key })(model)
    case 'gemini': return createGoogleGenerativeAI({ apiKey: key })(model)
    case 'xai': return createXai({ apiKey: key })(model)
    default: return createGroq({ apiKey: process.env.GROQ_API_KEY })(model)
  }
}

export async function POST(req: NextRequest) {
  const { messages, userKey, provider = 'groq', model = 'llama-3.3-70b-versatile', test } = await req.json()

  const usingFallback = !userKey

  if (usingFallback) {
    const used = await getUsedTokens(req)
    if (used >= TOKEN_CAP) {
      return new Response(
        JSON.stringify({ error: 'free_quota_exhausted', message: 'Free quota used up. Add your own API key for unlimited access.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const llm = usingFallback
    ? createGroq({ apiKey: process.env.GROQ_API_KEY })('llama-3.3-70b-versatile')
    : getProvider(provider, model, userKey)

  if (test) {
    // Minimal ping to verify key works
    const result = streamText({ model: llm, messages: [{ role: 'user', content: 'Say OK' }], maxTokens: 5 })
    const headers = new Headers({ 'Content-Type': 'text/plain' })
    return new Response('ok', { headers })
  }

  const result = streamText({ model: llm, messages, maxTokens: 1000 })

  const response = result.toDataStreamResponse()

  if (usingFallback) {
    // Approximate token count from messages length
    const approxTokens = JSON.stringify(messages).length / 4
    const used = await getUsedTokens(req)
    response.headers.set('Set-Cookie', await makeTokenCookie(used + approxTokens))
  }

  return response
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add streaming LLM proxy route with BYOK and Groq anon fallback"
```

---

## Task 3.3 — Chat Pane UI

**Files:**
- Create: `components/chat/AnonCapBanner.tsx`
- Create: `components/chat/ChatPanel.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Create `components/chat/AnonCapBanner.tsx`**

```tsx
interface AnonCapBannerProps { onOpenSettings: () => void }

export function AnonCapBanner({ onOpenSettings }: AnonCapBannerProps) {
  return (
    <div className="mx-3 my-2 p-3 rounded-lg bg-amber-950/40 border border-amber-700 text-xs text-amber-300 flex items-start gap-2">
      <span>⚡</span>
      <span>
        Free quota used up.{' '}
        <button onClick={onOpenSettings} className="underline hover:text-amber-100">
          Add your own API key
        </button>{' '}
        for unlimited access.
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/chat/ChatPanel.tsx`**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useChat } from 'ai/react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '@/lib/types'
import { getChatHistory, setChatHistory, clearChatHistory } from '@/lib/storage'
import { AnonCapBanner } from './AnonCapBanner'

interface ChatPanelProps {
  chatKey: string         // 'sandbox' or lesson step id
  provider: string
  model: string
  systemPrompt: string
  onOpenSettings: () => void
}

export function ChatPanel({ chatKey, provider, model, systemPrompt, onOpenSettings }: ChatPanelProps) {
  const [anonCapped, setAnonCapped] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    body: { provider, model, systemPrompt },
    onError: (err) => {
      if (err.message.includes('429') || err.message.includes('free_quota')) setAnonCapped(true)
    },
  })

  // Load persisted history on mount / chatKey change
  useEffect(() => {
    getChatHistory(chatKey).then((history) => {
      if (history.length > 0) setMessages(history.map((m) => ({ id: m.timestamp.toString(), role: m.role, content: m.content })))
    })
  }, [chatKey])

  // Persist on messages change
  useEffect(() => {
    if (messages.length === 0) return
    const toStore: ChatMessage[] = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content, timestamp: Date.now() }))
    setChatHistory(chatKey, toStore)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatKey])

  function clearChat() {
    clearChatHistory(chatKey)
    setMessages([])
    setAnonCapped(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-xs uppercase tracking-widest text-gray-500">AI Tutor</span>
        <button onClick={clearChat} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Clear</button>
      </div>
      {anonCapped && <AnonCapBanner onOpenSettings={onOpenSettings} />}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200'
            }`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-400 animate-pulse">…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-gray-800 shrink-0">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask the tutor…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
        />
        <button type="submit" disabled={isLoading || !input.trim()}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg text-white transition-colors">
          ↑
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Wire into `AppShell.tsx`** — replace chat placeholder with:

```tsx
import { ChatPanel } from '@/components/chat/ChatPanel'
// (system prompt wired in Task 3.5 — pass empty string for now)
<ChatPanel
  chatKey={mode === 'lessons' ? (activeLessonId ?? 'sandbox') : 'sandbox'}
  provider={sessionPrefs?.provider ?? 'groq'}
  model={sessionPrefs?.model ?? 'llama-3.3-70b-versatile'}
  systemPrompt=""
  onOpenSettings={() => setSettingsOpen(true)}
/>
```

Load `sessionPrefs` from IndexedDB in `AppShell` on mount via `useEffect`.

- [ ] **Step 4: Commit**

```bash
git add components/chat/ components/layout/AppShell.tsx
git commit -m "feat: add streaming chat panel with history persistence and anon quota banner"
```

---

## Task 3.4 — Validate → Diff → Narrate Loop

**Files:**
- Create: `lib/tutor.ts`
- Create: `__tests__/lib/tutor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/tutor.test.ts
import { computeDiff, buildNarratePayload } from '@/lib/tutor'

describe('computeDiff', () => {
  it('detects missing tuples', () => {
    const actual = { columns: ['?x'], rows: [['bob']] }
    const expected = { columns: ['?x'], rows: [['bob'], ['carol']] }
    const d = computeDiff(actual, expected)
    expect(d.missing).toEqual([['carol']])
    expect(d.unexpected).toEqual([])
  })

  it('detects unexpected tuples', () => {
    const actual = { columns: ['?x'], rows: [['bob'], ['dave']] }
    const expected = { columns: ['?x'], rows: [['bob']] }
    const d = computeDiff(actual, expected)
    expect(d.missing).toEqual([])
    expect(d.unexpected).toEqual([['dave']])
  })

  it('returns empty diff when results match', () => {
    const r = { columns: ['?x'], rows: [['bob']] }
    const d = computeDiff(r, r)
    expect(d.missing).toEqual([])
    expect(d.unexpected).toEqual([])
  })
})

describe('buildNarratePayload', () => {
  it('includes diff summary when diff present', () => {
    const payload = buildNarratePayload({
      query: '?- friend(alice, ?x).',
      queryResult: { columns: ['?x'], rows: [['bob']], executionTimeMs: 1 },
      queryError: null,
      diff: { missing: [['carol']], unexpected: [] },
      lessonStep: null,
      conversationHistory: [],
    })
    expect(payload).toContain('carol')
    expect(payload).toContain('missing')
  })

  it('includes error message when query failed', () => {
    const payload = buildNarratePayload({
      query: '?- bad syntax',
      queryResult: null,
      queryError: 'parse error at line 1',
      diff: null,
      lessonStep: null,
      conversationHistory: [],
    })
    expect(payload).toContain('parse error')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --testPathPattern=tutor
```

- [ ] **Step 3: Implement `lib/tutor.ts`**

```typescript
import type { QueryResult, TutorDiff, LessonStep, ChatMessage } from './types'

export type TutorContext = {
  query: string
  queryResult: QueryResult | null
  queryError: string | null
  diff: TutorDiff | null
  lessonStep: LessonStep | null
  conversationHistory: ChatMessage[]
}

export function computeDiff(
  actual: { columns: string[]; rows: string[][] },
  expected: { columns: string[]; rows: string[][] }
): TutorDiff {
  const toKey = (row: string[]) => row.join('\x00')
  const actualSet = new Set(actual.rows.map(toKey))
  const expectedSet = new Set(expected.rows.map(toKey))

  const missing = expected.rows.filter((r) => !actualSet.has(toKey(r)))
  const unexpected = actual.rows.filter((r) => !expectedSet.has(toKey(r)))

  return { missing, unexpected }
}

export function buildNarratePayload(ctx: TutorContext): string {
  const parts: string[] = []

  if (ctx.lessonStep) {
    parts.push(`Current lesson step: ${ctx.lessonStep.instruction}`)
  }

  parts.push(`User's query:\n\`\`\`datalog\n${ctx.query}\n\`\`\``)

  if (ctx.queryError) {
    parts.push(`Query error: ${ctx.queryError}`)
  } else if (ctx.diff) {
    const { missing, unexpected } = ctx.diff
    if (missing.length === 0 && unexpected.length === 0) {
      parts.push('Result matches expected output. The query is correct.')
    } else {
      if (missing.length > 0) {
        parts.push(`Missing tuples (expected but not in result): ${missing.map((r) => `[${r.join(', ')}]`).join(', ')}`)
      }
      if (unexpected.length > 0) {
        parts.push(`Unexpected tuples (in result but not expected): ${unexpected.map((r) => `[${r.join(', ')}]`).join(', ')}`)
      }
    }
  } else if (ctx.queryResult) {
    parts.push(`Query returned ${ctx.queryResult.rows.length} row(s). This is a free-form step — provide contextual feedback.`)
  }

  return parts.join('\n\n')
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- --testPathPattern=tutor
```

- [ ] **Step 5: Commit**

```bash
git add lib/tutor.ts __tests__/lib/tutor.test.ts
git commit -m "feat: implement validate→diff→narrate tutor logic with tests"
```

---

## Task 3.5 — System Prompt + Tutor Persona

**Files:**
- Create: `lib/system-prompt.ts`
- Create: `__tests__/lib/system-prompt.test.ts`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/lib/system-prompt.test.ts
import { buildSystemPrompt } from '@/lib/system-prompt'

it('includes stable Datalog syntax reference', () => {
  const prompt = buildSystemPrompt({ lessonStepGoal: null, progress: [] })
  expect(prompt).toContain(':-')
  expect(prompt).toContain('?-')
})

it('includes step goal when provided', () => {
  const prompt = buildSystemPrompt({ lessonStepGoal: 'Write a rule for mortal', progress: [] })
  expect(prompt).toContain('mortal')
})

it('always includes hints-not-solutions policy', () => {
  const prompt = buildSystemPrompt({ lessonStepGoal: null, progress: [] })
  expect(prompt.toLowerCase()).toContain('hint')
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --testPathPattern=system-prompt
```

- [ ] **Step 3: Implement `lib/system-prompt.ts`**

```typescript
// Stable prefix is long and cacheable — keep it identical across turns.
// Dynamic suffix appended per-turn.

const STABLE_PREFIX = `You are a patient, encouraging Minigraf tutor. Minigraf is a tiny embedded graph database with Datalog querying and bi-temporal time travel.

## Minigraf Datalog Syntax Reference

Facts:
  friend(alice, bob).          % alice is a friend of bob
  age(alice, 30).

Rules:
  ancestor(X, Y) :- parent(X, Y).
  ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).

Queries:
  ?- friend(alice, ?x).        % find all friends of alice
  ?- ancestor(alice, ?who).

Bi-temporal operators:
  assert_at(fact, valid_start, valid_end).   % asserts a fact with a valid-time range
  query_as_of(query, transaction_time).      % query as of a past transaction time
  correct(fact, valid_start, valid_end).     % retroactive correction

## Teaching Policy

- NEVER give the full solution directly. Guide with hints, ask questions, show partial examples.
- If the user is stuck after 2 failed attempts on the same step, reveal one more hint.
- Keep responses concise (3–6 sentences). Use markdown code blocks for any Datalog.
- If a query has a syntax error, explain the error and show the corrected syntax rule, not the corrected query.
- Be especially patient with bi-temporal concepts — they are genuinely confusing.`

export function buildSystemPrompt(opts: {
  lessonStepGoal: string | null
  progress: string[]
}): string {
  const parts = [STABLE_PREFIX]

  if (opts.lessonStepGoal) {
    parts.push(`\n## Current Step Goal\n${opts.lessonStepGoal}`)
  }

  if (opts.progress.length > 0) {
    parts.push(`\n## User Progress\nCompleted steps: ${opts.progress.join(', ')}`)
  }

  return parts.join('\n')
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- --testPathPattern=system-prompt
```

- [ ] **Step 5: Wire system prompt into `AppShell.tsx`**

```tsx
import { buildSystemPrompt } from '@/lib/system-prompt'
// Derive current step goal from useLesson (Task 4.2); for now pass null
const systemPrompt = buildSystemPrompt({ lessonStepGoal: null, progress: [] })
// Pass to <ChatPanel systemPrompt={systemPrompt} ... />
```

- [ ] **Step 6: Pass system prompt through proxy route** — in `app/api/chat/route.ts`, extract `systemPrompt` from request body and prepend it as a system message:

```typescript
const { messages, userKey, provider, model, systemPrompt, test } = await req.json()
const messagesWithSystem = systemPrompt
  ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
  : messages
// Use messagesWithSystem in streamText call
```

- [ ] **Step 7: Commit**

```bash
git add lib/system-prompt.ts __tests__/lib/system-prompt.test.ts components/layout/AppShell.tsx app/api/chat/route.ts
git commit -m "feat: add dynamic system prompt builder with cacheable stable prefix"
```

---

## Task 4.1 — Lesson Schema and Data Format

**Files:**
- Create: `lib/lessons/schema.ts`
- Create: `lib/lessons/index.ts` (empty export for now)

- [ ] **Step 1: Create `lib/lessons/schema.ts`**

```typescript
// Re-export the lesson types from lib/types.ts for convenience
export type { Lesson, LessonStep } from '@/lib/types'
```

- [ ] **Step 2: Create `lib/lessons/index.ts`**

```typescript
import type { Lesson } from '@/lib/types'
// Lessons imported in Tasks 4.3–4.6
export const LESSONS: Lesson[] = []
```

- [ ] **Step 3: Commit**

```bash
git add lib/lessons/
git commit -m "feat: add lesson schema types and empty lesson registry"
```

---

## Task 4.2 — Lesson Runner

**Files:**
- Create: `hooks/useLesson.ts`
- Create: `__tests__/hooks/useLesson.test.ts`
- Modify: `components/lessons/LessonSidebar.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/hooks/useLesson.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLesson } from '@/hooks/useLesson'
import { LESSONS } from '@/lib/lessons'
import type { Lesson } from '@/lib/types'

const mockLesson: Lesson = {
  id: 'test-lesson',
  title: 'Test',
  description: 'Test lesson',
  steps: [
    {
      id: 'step-1',
      instruction: 'Step 1',
      starterCode: 'friend(alice, bob).',
      expectedResult: { columns: ['?x'], rows: [['bob']] },
      hints: ['Try querying friend/2'],
      successMessage: 'Great!',
    },
    {
      id: 'step-2',
      instruction: 'Step 2',
      starterCode: '',
      hints: [],
      successMessage: 'Done!',
    },
  ],
}

jest.mock('@/lib/lessons', () => ({ LESSONS: [mockLesson] }))

it('loads first step on mount', () => {
  const { result } = renderHook(() => useLesson('test-lesson'))
  expect(result.current.currentStep?.id).toBe('step-1')
  expect(result.current.starterCode).toBe('friend(alice, bob).')
})

it('advances to next step on correct result', async () => {
  const { result } = renderHook(() => useLesson('test-lesson'))
  await act(async () => {
    const passed = await result.current.submitResult({ columns: ['?x'], rows: [['bob']], executionTimeMs: 1 })
    expect(passed).toBe(true)
  })
  expect(result.current.currentStep?.id).toBe('step-2')
})

it('does not advance on wrong result', async () => {
  const { result } = renderHook(() => useLesson('test-lesson'))
  await act(async () => {
    const passed = await result.current.submitResult({ columns: ['?x'], rows: [['wrong']], executionTimeMs: 1 })
    expect(passed).toBe(false)
  })
  expect(result.current.currentStep?.id).toBe('step-1')
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --testPathPattern=useLesson
```

- [ ] **Step 3: Implement `hooks/useLesson.ts`**

```typescript
'use client'
import { useCallback, useEffect, useState } from 'react'
import { LESSONS } from '@/lib/lessons'
import { getLessonProgress, setLessonProgress } from '@/lib/storage'
import { computeDiff } from '@/lib/tutor'
import type { Lesson, LessonStep, QueryResult } from '@/lib/types'

export function useLesson(lessonId: string | null) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  useEffect(() => {
    if (!lessonId) return
    const found = LESSONS.find((l) => l.id === lessonId) ?? null
    setLesson(found)
    getLessonProgress(lessonId).then((p) => {
      const completed = p?.completedSteps ?? []
      setCompletedSteps(completed)
      // Resume at first incomplete step
      const idx = found?.steps.findIndex((s) => !completed.includes(s.id)) ?? 0
      setStepIndex(Math.max(0, idx))
    })
  }, [lessonId])

  const currentStep: LessonStep | null = lesson?.steps[stepIndex] ?? null

  const submitResult = useCallback(async (result: QueryResult): Promise<boolean> => {
    if (!currentStep || !lessonId) return false
    if (!currentStep.expectedResult) return true // open-ended step always passes

    const diff = computeDiff(result, currentStep.expectedResult)
    const passed = diff.missing.length === 0 && diff.unexpected.length === 0

    if (passed) {
      const updated = [...completedSteps, currentStep.id]
      setCompletedSteps(updated)
      await setLessonProgress(lessonId, updated)
      setStepIndex((i) => i + 1)
    }

    return passed
  }, [currentStep, completedSteps, lessonId])

  const resetStep = useCallback(() => {
    // No state change needed — starterCode comes from currentStep
  }, [])

  return {
    lesson,
    currentStep,
    starterCode: currentStep?.starterCode ?? '',
    completedSteps,
    stepIndex,
    totalSteps: lesson?.steps.length ?? 0,
    submitResult,
    resetStep,
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- --testPathPattern=useLesson
```

- [ ] **Step 5: Wire into `AppShell.tsx`**

```tsx
import { useLesson } from '@/hooks/useLesson'
// ...
const lessonRunner = useLesson(mode === 'lessons' ? activeLessonId : null)
// Pass lessonRunner.starterCode as initial editor value when a lesson is selected
// Pass lessonRunner.currentStep to buildSystemPrompt for the step goal
// Connect <LessonSidebar> to show real progress
```

- [ ] **Step 6: Update `LessonSidebar.tsx`** to accept progress data:

```tsx
interface LessonSidebarProps {
  activeLessonId: string | null
  completedStepsPerLesson: Record<string, string[]>
  onSelect: (id: string) => void
}
```

Replace placeholder lock logic with: a lesson is unlocked if the previous lesson has at least one completed step (or is lesson-1).

- [ ] **Step 7: Commit**

```bash
git add hooks/useLesson.ts __tests__/hooks/useLesson.test.ts components/lessons/LessonSidebar.tsx components/layout/AppShell.tsx
git commit -m "feat: implement lesson runner with step progression and IndexedDB progress tracking"
```

---

## Task 4.3 — Lesson 1: Basic Facts and Queries

**Files:**
- Create: `lib/lessons/lesson-1.ts`
- Modify: `lib/lessons/index.ts`

- [ ] **Step 1: Create `lib/lessons/lesson-1.ts`**

```typescript
import type { Lesson } from '@/lib/types'

export const lesson1: Lesson = {
  id: 'lesson-1',
  title: 'Basic facts and queries',
  description: 'Learn to assert facts and run simple queries in Minigraf Datalog.',
  steps: [
    {
      id: 'l1-s1',
      instruction: `## Step 1: Assert some facts\n\nIn Datalog, facts are statements that are unconditionally true.\n\nThe code below asserts that alice and bob are friends. Run it to assert these facts.`,
      starterCode: `friend(alice, bob).\nfriend(alice, carol).\nfriend(bob, dave).`,
      expectedResult: { columns: [], rows: [] }, // assertion returns empty result set
      hints: [
        'Hit the ▶ Run button to assert the facts.',
        'Facts have the form: predicate(arg1, arg2). — note the trailing period.',
      ],
      successMessage: 'Facts asserted! The graph now knows about these friendships.',
    },
    {
      id: 'l1-s2',
      instruction: `## Step 2: Query a specific fact\n\nNow look up whether alice and bob are friends using a query.\n\nA query starts with \`?-\`.`,
      starterCode: `?- friend(alice, bob).`,
      expectedResult: { columns: [], rows: [[]] }, // succeeds with one empty-tuple result
      hints: [
        'Queries start with ?- and end with a period.',
        'This query asks "is friend(alice, bob) true?" — it should return one result (yes).',
      ],
      successMessage: 'Correct! The query confirmed alice and bob are friends.',
    },
    {
      id: 'l1-s3',
      instruction: `## Step 3: Query with a variable\n\nVariables start with \`?\`. Use a variable to find all friends of alice.`,
      starterCode: `?- friend(alice, ?who).`,
      expectedResult: { columns: ['?who'], rows: [['bob'], ['carol']] },
      hints: [
        'Variables like ?who match any value.',
        'The result should be a table with one column (?who) and two rows.',
      ],
      successMessage: 'You found all of Alice\'s friends using a variable query!',
    },
    {
      id: 'l1-s4',
      instruction: `## Step 4: Model your own dataset\n\nAssert at least 3 facts of your own choosing — anything you like (movies, cities, colleagues). Then write a query to retrieve one of them using a variable.\n\nThis step is open-ended — the tutor will give feedback on what you write.`,
      starterCode: `% Your facts here\n\n% Your query here`,
      hints: [
        'Try: likes(alice, jazz). likes(alice, hiking). likes(bob, jazz).',
        'Then query: ?- likes(alice, ?activity). to find all of Alice\'s interests.',
      ],
      successMessage: 'Great work! You\'ve modelled your own dataset.',
    },
  ],
}
```

- [ ] **Step 2: Register in `lib/lessons/index.ts`**

```typescript
import type { Lesson } from '@/lib/types'
import { lesson1 } from './lesson-1'

export const LESSONS: Lesson[] = [lesson1]
```

- [ ] **Step 3: Commit**

```bash
git add lib/lessons/lesson-1.ts lib/lessons/index.ts
git commit -m "feat: add Lesson 1 - basic facts and queries"
```

---

## Task 4.4 — Lesson 2: Rules and Inference

**Files:**
- Create: `lib/lessons/lesson-2.ts`
- Modify: `lib/lessons/index.ts`

- [ ] **Step 1: Create `lib/lessons/lesson-2.ts`**

```typescript
import type { Lesson } from '@/lib/types'

export const lesson2: Lesson = {
  id: 'lesson-2',
  title: 'Rules and inference',
  description: 'Define rules to derive new facts from existing ones.',
  steps: [
    {
      id: 'l2-s1',
      instruction: `## Step 1: Define a simple rule\n\nRules let Datalog derive new facts. The rule below says: if X is human, then X is mortal.\n\nAssert the facts and rule, then run it.`,
      starterCode: `human(socrates).\nhuman(plato).\n\nmortal(X) :- human(X).`,
      expectedResult: { columns: [], rows: [] },
      hints: ['Rules have the form: head :- body. — "head is true if body is true."'],
      successMessage: 'Rule defined! Now you can query derived facts.',
    },
    {
      id: 'l2-s2',
      instruction: `## Step 2: Query a derived fact\n\nNow query all mortals. Minigraf will use the rule to derive them from the human facts.`,
      starterCode: `?- mortal(?who).`,
      expectedResult: { columns: ['?who'], rows: [['socrates'], ['plato']] },
      hints: ['The mortal rule derives facts from human facts — you don\'t need to assert mortal directly.'],
      successMessage: 'Inference working! Socrates and Plato are derived as mortal via the rule.',
    },
    {
      id: 'l2-s3',
      instruction: `## Step 3: Chain two rules\n\nAdd a new rule: \`philosopher(X) :- mortal(X), human(X).\`\n\nAssert it alongside the previous facts and rules, then query all philosophers.`,
      starterCode: `human(socrates).\nhuman(plato).\n\nmortal(X) :- human(X).\nphilosopher(X) :- mortal(X), human(X).`,
      expectedResult: { columns: ['?who'], rows: [['socrates'], ['plato']] },
      hints: [
        'The body of a rule can reference other derived predicates.',
        'Query: ?- philosopher(?who).',
      ],
      successMessage: 'Rule chaining works! Both philosophers are derived through two rule hops.',
    },
    {
      id: 'l2-s4',
      instruction: `## Step 4: Write your own rule\n\nUsing the dataset you built in Lesson 1, write at least one rule that derives a new predicate from your facts. Then query it.\n\nThe tutor will give feedback.`,
      starterCode: `% Your facts from Lesson 1 here\n\n% Your rule here\n\n% Your query here`,
      hints: [
        'Example: popular(X) :- likes(_, X), likes(_, X). — but Datalog needs at least 2 distinct sources.',
        'Try something simple: colleague(X, Y) :- works_at(X, Z), works_at(Y, Z).',
      ],
      successMessage: 'You\'ve written your first custom rule!',
    },
  ],
}
```

- [ ] **Step 2: Add to `lib/lessons/index.ts`**

```typescript
import { lesson2 } from './lesson-2'
export const LESSONS: Lesson[] = [lesson1, lesson2]
```

- [ ] **Step 3: Commit**

```bash
git add lib/lessons/lesson-2.ts lib/lessons/index.ts
git commit -m "feat: add Lesson 2 - rules and inference"
```

---

## Task 4.5 — Lesson 3: Recursive Rules

**Files:**
- Create: `lib/lessons/lesson-3.ts`
- Modify: `lib/lessons/index.ts`

- [ ] **Step 1: Create `lib/lessons/lesson-3.ts`**

```typescript
import type { Lesson } from '@/lib/types'

export const lesson3: Lesson = {
  id: 'lesson-3',
  title: 'Recursive rules',
  description: 'Use recursive rules to compute transitive relationships.',
  steps: [
    {
      id: 'l3-s1',
      instruction: `## Step 1: Define a base case and recursive rule\n\nThe ancestor relationship is transitive: if A is a parent of B, A is an ancestor of B. Also, if A is a parent of C, and C is an ancestor of B, then A is an ancestor of B.\n\nAssert the facts and both rules.`,
      starterCode: `parent(alice, bob).\nparent(bob, carol).\nparent(carol, dave).\n\nancestor(X, Y) :- parent(X, Y).\nancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).`,
      expectedResult: { columns: [], rows: [] },
      hints: ['The second rule is the recursive case — it calls ancestor within its own body.'],
      successMessage: 'Recursive rules defined!',
    },
    {
      id: 'l3-s2',
      instruction: `## Step 2: Query the transitive closure\n\nFind all ancestors of dave. Because of the recursive rule, Minigraf will follow the chain all the way up.`,
      starterCode: `?- ancestor(?who, dave).`,
      expectedResult: { columns: ['?who'], rows: [['alice'], ['bob'], ['carol']] },
      hints: [
        'The query should return alice, bob, and carol — all reachable ancestors.',
        'Datalog always terminates on recursive rules because it only derives new facts, never infinite loops.',
      ],
      successMessage: 'Transitive closure computed! All three ancestors found.',
    },
    {
      id: 'l3-s3',
      instruction: `## Step 3: Observe termination\n\nAdd a cycle: \`parent(dave, alice).\` — then re-run the ancestor query.\n\nIn SQL, a recursive CTE with a cycle would loop forever. What does Minigraf do?`,
      starterCode: `parent(alice, bob).\nparent(bob, carol).\nparent(carol, dave).\nparent(dave, alice).\n\nancestor(X, Y) :- parent(X, Y).\nancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).\n\n?- ancestor(?who, dave).`,
      expectedResult: { columns: ['?who'], rows: [['alice'], ['bob'], ['carol'], ['dave']] },
      hints: [
        'Datalog is safe: it computes the fixed point and stops. It does not loop.',
        'With the cycle, dave is now also an ancestor of dave.',
      ],
      successMessage: 'Correct! Datalog terminates safely even with cycles.',
    },
    {
      id: 'l3-s4',
      instruction: `## Step 4: Model a hierarchy\n\nModel a hierarchy of your own (org chart, category tree, file system, etc.) with at least 4 nodes. Write a recursive rule to find all nodes reachable from the root.\n\nThe tutor will give feedback.`,
      starterCode: `% Your hierarchy facts here\n\n% Your reachability rule here\n\n% Your query here`,
      hints: [
        'Org chart: reports_to(bob, alice). — then reachable(X, Root) :- reports_to(X, Root). reachable(X, Root) :- reports_to(X, Z), reachable(Z, Root).',
      ],
      successMessage: 'You\'ve built a recursive hierarchy query!',
    },
  ],
}
```

- [ ] **Step 2: Add to `lib/lessons/index.ts`**

```typescript
import { lesson3 } from './lesson-3'
export const LESSONS: Lesson[] = [lesson1, lesson2, lesson3]
```

- [ ] **Step 3: Commit**

```bash
git add lib/lessons/lesson-3.ts lib/lessons/index.ts
git commit -m "feat: add Lesson 3 - recursive rules and transitive closure"
```

---

## Task 4.6 — Lesson 4: Bi-Temporal Time Travel

**Files:**
- Create: `lib/lessons/lesson-4.ts`
- Modify: `lib/lessons/index.ts`

> **Note:** The exact bi-temporal API syntax (assert_at, query_as_of, correct) must be verified against the WASM `.d.ts` and Minigraf documentation before writing this lesson. Adjust the starter code below to match the actual API.

- [ ] **Step 1: Create `lib/lessons/lesson-4.ts`**

```typescript
import type { Lesson } from '@/lib/types'

export const lesson4: Lesson = {
  id: 'lesson-4',
  title: 'Bi-temporal time travel',
  description: 'Assert facts with time ranges, query past states, and make retroactive corrections.',
  steps: [
    {
      id: 'l4-s1',
      instruction: `## Step 1: Assert a fact with a valid-time range\n\nBi-temporal facts have two time axes:\n- **Valid time** — when the fact was true in the real world.\n- **Transaction time** — when it was recorded in the database.\n\nAssert that alice was an employee from 2020 to 2023.`,
      starterCode: `% Assert alice was an employee from Jan 1 2020 to Dec 31 2023\nassert_at(employee(alice), "2020-01-01", "2023-12-31").`,
      expectedResult: { columns: [], rows: [] },
      hints: ['assert_at(fact, valid_start, valid_end) records a fact with a valid-time interval.'],
      successMessage: 'Temporal fact asserted!',
    },
    {
      id: 'l4-s2',
      instruction: `## Step 2: Query as-of a past timestamp\n\nQuery whether alice was an employee on July 1, 2021 — during her valid-time window.`,
      starterCode: `?- query_as_of(employee(alice), "2021-07-01").`,
      expectedResult: { columns: [], rows: [[]] },
      hints: ['query_as_of checks whether a fact was valid at a given point in valid time.'],
      successMessage: 'Time travel works! Alice was an employee in mid-2021.',
    },
    {
      id: 'l4-s3',
      instruction: `## Step 3: Make a retroactive correction\n\nYou discover the record was wrong — alice actually left on June 30, 2022, not Dec 31, 2023. Correct the fact retroactively.\n\nThen query alice's employment on both sides of the correction.`,
      starterCode: `% Correction: alice left June 30 2022\ncorrect(employee(alice), "2020-01-01", "2022-06-30").\n\n% Was she an employee in 2021? (yes)\n?- query_as_of(employee(alice), "2021-06-01").\n\n% Was she an employee in 2023? (no)\n?- query_as_of(employee(alice), "2023-01-01").`,
      expectedResult: { columns: [], rows: [[]] }, // first query returns true
      hints: [
        'correct() does not delete the original — it adds a corrective entry. Both versions are retained.',
        'The first query should still succeed (2021 is within both the original and corrected range).',
      ],
      successMessage: 'Retroactive correction applied! The original record is preserved in transaction history.',
    },
    {
      id: 'l4-s4',
      instruction: `## Step 4: Query the full temporal history\n\nQuery all versions of alice's employment — including both the original and corrected entries — to see the full audit trail.`,
      starterCode: `?- temporal_history(employee(alice), ?valid_start, ?valid_end, ?tx_time).`,
      expectedResult: { columns: ['?valid_start', '?valid_end', '?tx_time'], rows: [] }, // rows depend on runtime
      hints: [
        'temporal_history returns all versions of a fact with their valid-time ranges and when they were recorded.',
        'You should see at least two rows: the original assertion and the correction.',
      ],
      successMessage: 'Full audit trail visible! This is bi-temporal\'s superpower — nothing is ever truly deleted.',
    },
    {
      id: 'l4-s5',
      instruction: `## Step 5: Model a real-world scenario\n\nModel an event that was recorded incorrectly and later corrected. For example:\n- A price that was entered wrong and fixed.\n- A diagnosis that was revised.\n- A project assignment that was backdated.\n\nAssert the original, then correct it, then query both the current view and the historical audit trail.\n\nThe tutor will give feedback.`,
      starterCode: `% Your scenario here`,
      hints: [
        'Think of any real-world case where data was wrong and needed retroactive correction.',
        'The key insight: bi-temporal lets you answer "what did we know, and when did we know it?"',
      ],
      successMessage: 'Excellent! You understand bi-temporal reasoning — one of Minigraf\'s most powerful features.',
    },
  ],
}
```

- [ ] **Step 2: Add to `lib/lessons/index.ts`**

```typescript
import { lesson4 } from './lesson-4'
export const LESSONS: Lesson[] = [lesson1, lesson2, lesson3, lesson4]
```

- [ ] **Step 3: Update `LessonSidebar.tsx`** — remove lock icons; all lessons are now present and progression is handled by `useLesson`.

- [ ] **Step 4: Commit**

```bash
git add lib/lessons/lesson-4.ts lib/lessons/index.ts components/lessons/LessonSidebar.tsx
git commit -m "feat: add Lesson 4 - bi-temporal time travel"
```

---

## Task 5.1 — Error States and Loading Skeletons

**Files:**
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/results/ResultsPanel.tsx`
- Modify: `components/chat/ChatPanel.tsx`
- Modify: `hooks/useMinigraf.ts`

- [ ] **Step 1: WASM loading skeleton in `AppShell.tsx`**

While `useMinigraf` status is `'loading'`, show a full-width banner at the top of the left panel:

```tsx
{wasmStatus === 'loading' && (
  <div className="px-3 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-500 animate-pulse">
    Loading Minigraf WASM…
  </div>
)}
{wasmStatus === 'error' && (
  <div className="px-3 py-2 bg-red-950/40 border-b border-red-800 text-xs text-red-400 flex items-center justify-between">
    <span>Failed to load Minigraf WASM.</span>
    <button onClick={() => window.location.reload()} className="underline hover:text-red-200">Reload</button>
  </div>
)}
```

Expose `status` from `useMinigraf` and pass it as `wasmStatus` prop or use the hook directly in `AppShell`.

- [ ] **Step 2: Query error line highlight in `QueryEditor.tsx`**

Parse the error message for a line number (e.g. `line 3`). If found, add a red background to that line using CodeMirror's decoration API:

```typescript
// In QueryEditor.tsx — add an effect extension when queryError changes
import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'

const addErrorLine = StateEffect.define<number>()
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
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

Add CSS: `.cm-error-line { background: rgba(239, 68, 68, 0.15); }`

- [ ] **Step 3: IndexedDB error handling in `lib/storage.ts`**

Wrap all `getDB()` calls in try/catch. On failure, log a warning and return sensible defaults:

```typescript
async function safeGetDB() {
  try { return await getDB() }
  catch (e) { console.warn('IndexedDB unavailable:', e); return null }
}
// Update each exported function to check for null db and return null/[] defaults
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/AppShell.tsx components/results/ResultsPanel.tsx components/chat/ChatPanel.tsx hooks/useMinigraf.ts lib/storage.ts components/editor/QueryEditor.tsx
git commit -m "feat: add loading skeletons, WASM error banner, query error line highlight, and storage error fallbacks"
```

---

## Task 5.2 — Responsive Layout

**Files:**
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/results/ResultsPanel.tsx`

- [ ] **Step 1: Add mobile breakpoint to `AppShell.tsx`**

Below 768px, replace the side-by-side split-pane with a tab bar at the top:

```tsx
'use client'
import { useState, useEffect } from 'react'

type MobileTab = 'editor' | 'results' | 'chat'

// Detect mobile
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

// In render:
const [mobileTab, setMobileTab] = useState<MobileTab>('editor')

return (
  <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
    <NavBar ... />
    {/* Mobile tab bar */}
    <div className="flex md:hidden border-b border-gray-800 shrink-0">
      {(['editor', 'results', 'chat'] as MobileTab[]).map((t) => (
        <button key={t} onClick={() => setMobileTab(t)}
          className={`flex-1 py-2 text-xs capitalize ${mobileTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}>
          {t}
        </button>
      ))}
    </div>
    {/* Desktop: split-pane; Mobile: single active tab */}
    <div className="flex flex-1 overflow-hidden">
      <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} md:flex flex-col md:w-[${leftWidthPct}%] overflow-hidden`}
        style={{ width: `${leftWidthPct}%` }}>
        {/* editor + results stacked */}
      </div>
      <ResizeHandle ... className="hidden md:block" />
      <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden`}>
        {/* chat */}
      </div>
    </div>
  </div>
)
```

- [ ] **Step 2: Graph viz degrades on small screens** — in `ResultsPanel.tsx`, disable the graph toggle on screens below 640px:

```tsx
const [isSmallScreen, setIsSmallScreen] = useState(false)
useEffect(() => {
  const check = () => setIsSmallScreen(window.innerWidth < 640)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])
// Add: disabled={!canGraph || isSmallScreen}
```

- [ ] **Step 3: Lessons sidebar on mobile** — in lessons mode on mobile, add a step indicator above the tab bar:

```tsx
{mode === 'lessons' && lessonRunner.currentStep && (
  <div className="md:hidden px-3 py-1.5 border-b border-gray-800 text-xs text-gray-500">
    Step {lessonRunner.stepIndex + 1} / {lessonRunner.totalSteps}: {lessonRunner.currentStep.instruction.split('\n')[0].replace(/^#+\s*/, '')}
  </div>
)}
```

- [ ] **Step 4: Test in browser at 375px, 768px, 1280px widths** using DevTools responsive mode.

- [ ] **Step 5: Commit**

```bash
git add components/layout/AppShell.tsx components/results/ResultsPanel.tsx
git commit -m "feat: add responsive layout with mobile tab view and graph viz degradation"
```

---

## Task 5.3 — Share Query via URL Hash

**Files:**
- Modify: `components/editor/QueryEditor.tsx`
- Modify: `app/page.tsx` or `components/layout/AppShell.tsx`

- [ ] **Step 1: Write test**

```typescript
// __tests__/lib/share.test.ts
import { encodeQuery, decodeQuery } from '@/lib/share'

it('round-trips a query string', () => {
  const original = '?- friend(alice, ?x).\nfriend(alice, bob).'
  expect(decodeQuery(encodeQuery(original))).toBe(original)
})

it('returns null for invalid base64', () => {
  expect(decodeQuery('!!!invalid')).toBeNull()
})
```

- [ ] **Step 2: Create `lib/share.ts`**

```typescript
export function encodeQuery(query: string): string {
  return btoa(encodeURIComponent(query))
}

export function decodeQuery(encoded: string): string | null {
  try { return decodeURIComponent(atob(encoded)) }
  catch { return null }
}
```

- [ ] **Step 3: Run test — expect PASS**

```bash
npm test -- --testPathPattern=share
```

- [ ] **Step 4: Add Share button to `QueryEditor.tsx`**

```tsx
import { encodeQuery } from '@/lib/share'
// ...
const [copied, setCopied] = useState(false)

function share() {
  const url = `${window.location.origin}${window.location.pathname}#q=${encodeQuery(value)}`
  navigator.clipboard.writeText(url)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
// Add button next to Run:
<button onClick={share} className="px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md transition-colors">
  {copied ? '✓ Copied' : 'Share'}
</button>
```

- [ ] **Step 5: Read hash on load in `AppShell.tsx`**

```tsx
useEffect(() => {
  const hash = window.location.hash
  if (hash.startsWith('#q=')) {
    const decoded = decodeQuery(hash.slice(3))
    if (decoded) setEditorValue(decoded)
  }
}, [])
```

- [ ] **Step 6: Commit**

```bash
git add lib/share.ts __tests__/lib/share.test.ts components/editor/QueryEditor.tsx components/layout/AppShell.tsx
git commit -m "feat: add share-query-via-URL-hash with copy-to-clipboard"
```

---

## Task 5.4 — /terms Static Page

**Files:**
- Modify: `app/terms/page.tsx`

- [ ] **Step 1: Replace placeholder with full content**

```tsx
export const metadata = { title: 'Terms & Conditions — Minigraf Playground' }

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 px-6 text-gray-300 space-y-8">
      <h1 className="text-2xl font-bold text-white">Terms &amp; Conditions</h1>
      <p className="text-sm text-gray-500">Last updated: April 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What stays in your browser</h2>
        <p>The following data is stored exclusively in your browser&apos;s IndexedDB and is never transmitted to our servers:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Your API keys for Anthropic, OpenAI, Google, xAI, and Groq</li>
          <li>Your graph state (the Datalog facts and rules you have asserted)</li>
          <li>Your lesson progress</li>
          <li>Your chat history with the AI tutor</li>
          <li>Your provider and model preferences</li>
        </ul>
        <p className="text-sm">Clearing your browser storage or using a different browser will reset all of the above.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What gets sent to third parties</h2>
        <p className="text-sm">When you use the AI tutor, your queries, chat messages, and contextual information about your current lesson are sent to the LLM provider you have selected. If you have not provided your own API key, an anonymous fallback using Groq is used.</p>
        <p className="text-sm">Each provider processes this data under their own privacy policy:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><a href="https://www.anthropic.com/legal/privacy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
          <li><a href="https://openai.com/policies/privacy-policy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a></li>
          <li><a href="https://policies.google.com/privacy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
          <li><a href="https://x.ai/legal/privacy-policy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">xAI Privacy Policy</a></li>
          <li><a href="https://groq.com/privacy-policy/" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Groq Privacy Policy</a></li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Disclaimer</h2>
        <p className="text-sm">Minigraf Playground is provided as-is, without warranty of any kind. It is an educational tool and is not intended for production use. Use at your own risk.</p>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/terms/page.tsx
git commit -m "feat: add full terms and conditions page with provider privacy links"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Next.js + Tailwind + Vercel AI SDK | 1.1 |
| Vercel deployment config + env vars | 1.2 |
| WASM tarball download, postinstall, gitignore | 1.3 |
| WASM loader singleton hook | 1.4 |
| IndexedDB stores (all 5) | 1.5 |
| First-visit privacy modal | 1.6 |
| Split-pane layout, drag resize | 2.1 |
| CodeMirror 6, Datalog highlighting, Run button | 2.2 |
| Results table, sort, empty/error states | 2.3 |
| Graph viz toggle, React Flow, 2-column guard | 2.4 |
| Lessons/Sandbox mode toggle, sidebar | 2.5 |
| Provider selector, BYOK, key storage, test conn | 3.1 |
| Proxy route, anon fallback, token cap, 429 | 3.2 |
| Chat UI, streaming, history persistence, clear | 3.3 |
| Validate→Diff→Narrate, diff logic | 3.4 |
| System prompt, cacheable prefix | 3.5 |
| Lesson schema types | 4.1 |
| Lesson runner, progress, submitResult | 4.2 |
| Lesson 1 content (4 steps) | 4.3 |
| Lesson 2 content (4 steps) | 4.4 |
| Lesson 3 content (4 steps) | 4.5 |
| Lesson 4 content (5 steps) | 4.6 |
| Error states, loading skeletons, WASM banner | 5.1 |
| Responsive layout, mobile tabs | 5.2 |
| Share via URL hash | 5.3 |
| /terms page with provider links | 5.4 |

**All 26 spec requirements covered. No placeholders found.**

**Type consistency check:**
- `QueryResult` defined in `lib/types.ts` (Task 1.4), used in `useMinigraf`, `ResultsTable`, `ResultsGraph`, `useLesson`, `tutor.ts` — consistent.
- `Provider` type used in `storage.ts`, `SettingsDrawer`, `route.ts` — consistent.
- `ChatMessage` used in `storage.ts` and `ChatPanel` — consistent.
- `LessonStep.expectedResult` shape matches `computeDiff` parameter shape — consistent.
- `computeDiff` called in both `tutor.ts` (Task 3.4) and `useLesson.ts` (Task 4.2) with same signature — consistent.
