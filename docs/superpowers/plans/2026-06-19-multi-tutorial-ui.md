# Multi-Tutorial UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Tutorial` layer above the existing lesson runner so the app can host multiple storyline-based tutorials (Basic Datalog, Marketplace, Org Chart, Sports League, Transit), each with isolated Minigraf graph state in its own named IndexedDB database.

**Architecture:** A new `Tutorial` type groups existing `Lesson` entities. `useTutorial` manages active tutorial selection, unlock logic, and lesson resume position. `useMinigraf` gains a per-tutorial LRU instance cache (max 2) backed by named IDB databases (`minigraf-<tutorialId>`). A new `TutorialSidebar` replaces `LessonSidebar` with an inline dropdown switcher.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, `@minigraf/browser`, `idb`, React Testing Library, Jest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/types.ts` | Modify | Add `Tutorial` type; add `activeTutorialId` to `SessionPrefs` |
| `lib/lessons/tutorial-basic-datalog.ts` | Create | Wraps lesson-1..4 into a `Tutorial` |
| `lib/lessons/tutorial-marketplace.ts` | Create | Stub `Tutorial` for issue #28 |
| `lib/lessons/tutorial-org-chart.ts` | Create | Stub `Tutorial` for issue #29 |
| `lib/lessons/tutorial-sports-league.ts` | Create | Stub `Tutorial` for issue #30 |
| `lib/lessons/tutorial-transit.ts` | Create | Stub `Tutorial` for issue #31 |
| `lib/lessons/index.ts` | Modify | Replace `LESSONS` export with `TUTORIALS` |
| `hooks/useLesson.ts` | Modify | Find lessons from `TUTORIALS` instead of flat `LESSONS` |
| `lib/wasm-loader.ts` | Modify | Accept `dbName` parameter |
| `hooks/useMinigraf.ts` | Modify | Accept `tutorialId`; add LRU instance cache |
| `hooks/useTutorial.ts` | Create | Manage active tutorial, lesson resume, unlock logic |
| `components/lessons/TutorialSidebar.tsx` | Create | Sidebar with dropdown switcher |
| `components/lessons/LessonSidebar.tsx` | Delete | Replaced by TutorialSidebar |
| `components/layout/AppShell.tsx` | Modify | Wire useTutorial, useMinigraf(tutorialId), TutorialSidebar; remove LESSON_INTROS |
| `__tests__/lib/lessons.test.ts` | Modify | Assert against `TUTORIALS` |
| `__tests__/hooks/useLesson.test.ts` | Modify | Update mock from `LESSONS` to `TUTORIALS` shape |
| `__tests__/hooks/useMinigraf.test.ts` | Create | Test LRU eviction |
| `__tests__/hooks/useTutorial.test.ts` | Create | Test unlock logic, switching, resume |
| `__tests__/components/AppShell.test.tsx` | Modify | Update mocks for new imports |

---

### Task 1: Add `Tutorial` type and update `SessionPrefs`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the `Tutorial` type and `activeTutorialId` field**

Open `lib/types.ts`. Add the `Tutorial` type after the `Lesson` type, and add `activeTutorialId` to `SessionPrefs`:

```ts
// Add after the Lesson type:
export type Tutorial = {
  id: string
  title: string
  description: string
  goals: string
  prerequisiteTutorialId?: string
  lessons: Lesson[]
}
```

Update `SessionPrefs`:
```ts
export type SessionPrefs = {
  provider: Provider
  model: string
  mode?: 'sandbox' | 'lessons'
  activeLessonId?: string
  activeTutorialId?: string   // ← add this line
}
```

- [ ] **Step 2: Run tests to confirm no regressions**

```bash
npm test -- --testPathPattern="lib/storage|lib/system-prompt" 2>&1 | tail -20
```

Expected: all passing (no test imports `Tutorial` yet).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Tutorial type and activeTutorialId to SessionPrefs"
```

---

### Task 2: Create `tutorial-basic-datalog.ts` and update lesson registry

**Files:**
- Create: `lib/lessons/tutorial-basic-datalog.ts`
- Modify: `lib/lessons/index.ts`
- Modify: `hooks/useLesson.ts`
- Modify: `__tests__/hooks/useLesson.test.ts`

- [ ] **Step 1: Create `lib/lessons/tutorial-basic-datalog.ts`**

```ts
import type { Tutorial } from '@/lib/types'
import { lesson1 } from './lesson-1'
import { lesson2 } from './lesson-2'
import { lesson3 } from './lesson-3'
import { lesson4 } from './lesson-4'

export const tutorialBasicDatalog: Tutorial = {
  id: 'basic-datalog',
  title: 'Basic Datalog',
  description: 'Learn the fundamentals of Minigraf: facts, queries, rules, and bi-temporal time travel.',
  goals: 'asserting and retracting facts, running Datalog queries, defining rules, recursive traversal, and bi-temporal time travel',
  lessons: [lesson1, lesson2, lesson3, lesson4],
}
```

- [ ] **Step 2: Update `lib/lessons/index.ts`**

Replace the entire file:

```ts
import type { Tutorial } from '@/lib/types'
import { tutorialBasicDatalog } from './tutorial-basic-datalog'

export const TUTORIALS: Tutorial[] = [
  tutorialBasicDatalog,
]
```

(Stub tutorials for #28–#31 are added in Task 3.)

- [ ] **Step 3: Update `hooks/useLesson.ts` to find lessons from `TUTORIALS`**

`useLesson` currently imports `LESSONS` and does `LESSONS.find(l => l.id === lessonId)`. Change it to search across all tutorials:

Find the import at the top of `hooks/useLesson.ts`:
```ts
import { LESSONS } from '@/lib/lessons'
```
Replace with:
```ts
import { TUTORIALS } from '@/lib/lessons'
```

Find the line:
```ts
const found = LESSONS.find((l) => l.id === lessonId) ?? null
```
Replace with:
```ts
const found = TUTORIALS.flatMap((t) => t.lessons).find((l) => l.id === lessonId) ?? null
```

- [ ] **Step 4: Update the mock in `__tests__/hooks/useLesson.test.ts`**

The mock currently provides `LESSONS`. Change it to `TUTORIALS` shape:

Find:
```ts
jest.mock('@/lib/lessons', () => ({
  LESSONS: [
    {
      id: 'test-lesson',
```
Replace with:
```ts
jest.mock('@/lib/lessons', () => ({
  TUTORIALS: [
    {
      id: 'test-tutorial',
      title: 'Test Tutorial',
      description: '',
      goals: '',
      lessons: [
        {
          id: 'test-lesson',
```

And close the extra nesting — the full mock should be:
```ts
jest.mock('@/lib/lessons', () => ({
  TUTORIALS: [
    {
      id: 'test-tutorial',
      title: 'Test Tutorial',
      description: '',
      goals: '',
      lessons: [
        {
          id: 'test-lesson',
          title: 'Test',
          description: 'Test lesson',
          steps: [
            {
              id: 'step-1',
              instruction: 'Step 1',
              starterCode: 'friend(alice, bob).',
              expectedResult: { columns: ['?x'], rows: [['bob']] },
              hints: [],
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
        },
      ],
    },
  ],
}))
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --testPathPattern="useLesson" 2>&1 | tail -20
```

Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons/tutorial-basic-datalog.ts lib/lessons/index.ts hooks/useLesson.ts __tests__/hooks/useLesson.test.ts
git commit -m "feat: add Tutorial wrapper for basic-datalog and update lesson registry"
```

---

### Task 3: Create stub tutorials for issues #28–#31

**Files:**
- Create: `lib/lessons/tutorial-marketplace.ts`
- Create: `lib/lessons/tutorial-org-chart.ts`
- Create: `lib/lessons/tutorial-sports-league.ts`
- Create: `lib/lessons/tutorial-transit.ts`
- Modify: `lib/lessons/index.ts`

- [ ] **Step 1: Create `lib/lessons/tutorial-marketplace.ts`**

```ts
import type { Tutorial } from '@/lib/types'

export const tutorialMarketplace: Tutorial = {
  id: 'marketplace',
  title: 'Corestore Marketplace',
  description: 'Model a multi-seller e-commerce platform with temporal price tracking.',
  goals: 'multi-seller joins, temporal price comparison, aggregates per seller, negation, and disjunction',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #28
}
```

- [ ] **Step 2: Create `lib/lessons/tutorial-org-chart.ts`**

```ts
import type { Tutorial } from '@/lib/types'

export const tutorialOrgChart: Tutorial = {
  id: 'org-chart',
  title: 'Company Org Chart',
  description: 'Model employees, departments, and reporting lines with retroactive salary corrections.',
  goals: 'recursive management-chain rules, retroactive salary corrections, and bi-temporal audit queries',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #29
}
```

- [ ] **Step 3: Create `lib/lessons/tutorial-sports-league.ts`**

```ts
import type { Tutorial } from '@/lib/types'

export const tutorialSportsLeague: Tutorial = {
  id: 'sports-league',
  title: 'Sports League',
  description: 'Track teams, player transfers, and match results across a full season.',
  goals: 'bi-temporal contract tracking, recursive head-to-head rules, and window-style aggregates',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #30
}
```

- [ ] **Step 4: Create `lib/lessons/tutorial-transit.ts`**

```ts
import type { Tutorial } from '@/lib/types'

export const tutorialTransit: Tutorial = {
  id: 'transit',
  title: 'City Transit Network',
  description: 'Model stations, lines, timetable changes, and service suspensions.',
  goals: 'recursive reachability, shortest path by hops, future-dated valid-time, and retroactive suspensions',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #31
}
```

- [ ] **Step 5: Register all tutorials in `lib/lessons/index.ts`**

Replace the file:
```ts
import type { Tutorial } from '@/lib/types'
import { tutorialBasicDatalog } from './tutorial-basic-datalog'
import { tutorialMarketplace } from './tutorial-marketplace'
import { tutorialOrgChart } from './tutorial-org-chart'
import { tutorialSportsLeague } from './tutorial-sports-league'
import { tutorialTransit } from './tutorial-transit'

export const TUTORIALS: Tutorial[] = [
  tutorialBasicDatalog,
  tutorialMarketplace,
  tutorialOrgChart,
  tutorialSportsLeague,
  tutorialTransit,
]
```

- [ ] **Step 6: Run tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all passing.

- [ ] **Step 7: Commit**

```bash
git add lib/lessons/tutorial-marketplace.ts lib/lessons/tutorial-org-chart.ts lib/lessons/tutorial-sports-league.ts lib/lessons/tutorial-transit.ts lib/lessons/index.ts
git commit -m "feat: add stub tutorials for Marketplace, Org Chart, Sports League, and Transit"
```

---

### Task 4: Update tutorial registry tests

**Files:**
- Modify: `__tests__/lib/lessons.test.ts`

- [ ] **Step 1: Rewrite `__tests__/lib/lessons.test.ts`**

Replace the entire file:

```ts
import { TUTORIALS } from '@/lib/lessons'

describe('tutorial registry', () => {
  it('exports five tutorials in order', () => {
    expect(TUTORIALS.map((t) => t.id)).toEqual([
      'basic-datalog',
      'marketplace',
      'org-chart',
      'sports-league',
      'transit',
    ])
  })

  it('basic-datalog has no prerequisite', () => {
    const basic = TUTORIALS.find((t) => t.id === 'basic-datalog')!
    expect(basic.prerequisiteTutorialId).toBeUndefined()
  })

  it('all other tutorials require basic-datalog', () => {
    const others = TUTORIALS.filter((t) => t.id !== 'basic-datalog')
    others.forEach((t) => {
      expect(t.prerequisiteTutorialId).toBe('basic-datalog')
    })
  })

  it('lesson IDs are globally unique across all tutorials', () => {
    const allLessonIds = TUTORIALS.flatMap((t) => t.lessons.map((l) => l.id))
    expect(allLessonIds.length).toBe(new Set(allLessonIds).size)
  })

  it('basic-datalog has 4 lessons with the expected step counts', () => {
    const basic = TUTORIALS.find((t) => t.id === 'basic-datalog')!
    expect(basic.lessons.map((l) => l.steps.length)).toEqual([4, 4, 4, 5])
  })

  it('final step of each non-first basic-datalog lesson is open-ended', () => {
    const basic = TUTORIALS.find((t) => t.id === 'basic-datalog')!
    basic.lessons.slice(1).forEach((lesson) => {
      expect(lesson.steps.at(-1)?.expectedResult).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --testPathPattern="lib/lessons" 2>&1 | tail -20
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add __tests__/lib/lessons.test.ts
git commit -m "test: update lesson registry tests to assert against TUTORIALS"
```

---

### Task 5: Parameterize `wasm-loader`

**Files:**
- Modify: `lib/wasm-loader.ts`

- [ ] **Step 1: Add `dbName` parameter**

Replace the entire file:

```ts
import init, { BrowserDb } from '@minigraf/browser'

export async function loadMinigraf(dbName: string) {
  await init()
  return BrowserDb.open(dbName)
}
```

- [ ] **Step 2: Run tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all passing. (`useMinigraf` still calls `loadMinigraf()` with no args — it will get a TypeScript error but tests use mocks, so runtime tests pass. The TS error is fixed in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add lib/wasm-loader.ts
git commit -m "feat: parameterize wasm-loader dbName for per-tutorial IDB isolation"
```

---

### Task 6: Add LRU instance cache to `useMinigraf`

**Files:**
- Modify: `hooks/useMinigraf.ts`
- Create: `__tests__/hooks/useMinigraf.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useMinigraf.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react'

const mockClose = jest.fn()
const mockExecute = jest.fn().mockResolvedValue('{"variables":[],"results":[]}')

jest.mock('@/lib/wasm-loader', () => ({
  loadMinigraf: jest.fn((dbName: string) =>
    Promise.resolve({ execute: mockExecute, close: mockClose, _db: dbName })
  ),
}))

import { loadMinigraf } from '@/lib/wasm-loader'

// Reset module between tests so the module-level cache is cleared
beforeEach(() => {
  jest.resetModules()
  mockClose.mockClear()
  ;(loadMinigraf as jest.Mock).mockClear()
})

describe('useMinigraf LRU cache', () => {
  it('reuses the cached instance for the same tutorialId', async () => {
    const { useMinigraf } = await import('@/hooks/useMinigraf')
    const { result: r1 } = renderHook(() => useMinigraf('tutorial-a'))
    const { result: r2 } = renderHook(() => useMinigraf('tutorial-a'))
    await waitFor(() => expect(r1.current.status).toBe('ready'))
    await waitFor(() => expect(r2.current.status).toBe('ready'))
    expect(loadMinigraf).toHaveBeenCalledTimes(1)
  })

  it('evicts the LRU instance when MAX_CACHED_INSTANCES is exceeded', async () => {
    const { useMinigraf } = await import('@/hooks/useMinigraf')
    const { result: r1 } = renderHook(() => useMinigraf('tutorial-a'))
    await waitFor(() => expect(r1.current.status).toBe('ready'))
    const { result: r2 } = renderHook(() => useMinigraf('tutorial-b'))
    await waitFor(() => expect(r2.current.status).toBe('ready'))
    // Opening a third tutorial should evict tutorial-a (LRU)
    const { result: r3 } = renderHook(() => useMinigraf('tutorial-c'))
    await waitFor(() => expect(r3.current.status).toBe('ready'))
    expect(mockClose).toHaveBeenCalledTimes(1)
    expect(loadMinigraf).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern="useMinigraf" 2>&1 | tail -30
```

Expected: FAIL — `useMinigraf` doesn't accept a `tutorialId` argument yet.

- [ ] **Step 3: Rewrite `hooks/useMinigraf.ts`**

Replace the entire file:

```ts
'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'
import { loadMinigraf } from '@/lib/wasm-loader'
import { normalizeExecutionResults, splitForms } from '@/lib/minigraf-execution'

type Status = 'loading' | 'ready' | 'error'

export const MAX_CACHED_INSTANCES = 2

const instanceCache = new Map<string, { promise: Promise<unknown>; lastUsed: number }>()

function evictLRUIfNeeded() {
  if (instanceCache.size < MAX_CACHED_INSTANCES) return
  let lruKey = ''
  let lruTime = Infinity
  for (const [key, entry] of instanceCache) {
    if (entry.lastUsed < lruTime) {
      lruTime = entry.lastUsed
      lruKey = key
    }
  }
  if (lruKey) {
    instanceCache.get(lruKey)!.promise.then((inst) =>
      (inst as { close?: () => void }).close?.()
    )
    instanceCache.delete(lruKey)
  }
}

function getOrCreateInstance(tutorialId: string): Promise<unknown> {
  if (instanceCache.has(tutorialId)) {
    instanceCache.get(tutorialId)!.lastUsed = Date.now()
    return instanceCache.get(tutorialId)!.promise
  }
  evictLRUIfNeeded()
  const promise = loadMinigraf(`minigraf-${tutorialId}`)
  instanceCache.set(tutorialId, { promise, lastUsed: Date.now() })
  return promise
}

export function useMinigraf(tutorialId: string) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<unknown>(null)

  useEffect(() => {
    setStatus('loading')
    getOrCreateInstance(tutorialId)
      .then((inst) => {
        instanceRef.current = inst
        setStatus('ready')
      })
      .catch((err) => {
        setError(String(err))
        setStatus('error')
      })
  }, [tutorialId])

  async function query(datalog: string): Promise<QueryResult> {
    if (!instanceRef.current) throw new Error('Minigraf not ready')
    const inst = instanceRef.current as { execute: (q: string) => Promise<string> }
    const forms = splitForms(datalog)
    const trimmed = datalog.trim()
    if (!trimmed) {
      throw new Error('No statements to execute')
    }

    const startTime = performance.now()
    const rawResults: string[] = []

    for (const form of forms) {
      rawResults.push(await inst.execute(form))
    }

    if (forms.length === 0 && trimmed.length > 0) {
      throw new Error('Syntax error: unmatched parentheses or incomplete expression')
    }

    return normalizeExecutionResults(
      rawResults,
      Math.round(performance.now() - startTime)
    )
  }

  return { status, error, query }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern="useMinigraf" 2>&1 | tail -30
```

Expected: all passing.

- [ ] **Step 5: Note on sandbox IDB rename**

The sandbox mode previously used `BrowserDb.open('minigraf')`. With this change, `useMinigraf('sandbox')` opens `BrowserDb.open('minigraf-sandbox')`. This is a one-time breaking change: any facts a user transacted in sandbox mode before this change will not carry over. Since sandbox state is ephemeral by design, no migration is needed. The old `minigraf` IDB database will be left behind in the browser; it can be cleaned up manually via DevTools → Application → IndexedDB.

- [ ] **Step 6: Commit**

```bash
git add hooks/useMinigraf.ts __tests__/hooks/useMinigraf.test.ts
git commit -m "feat: add per-tutorial LRU WASM instance cache to useMinigraf"
```

---

### Task 7: Implement `useTutorial` hook

**Files:**
- Create: `hooks/useTutorial.ts`
- Create: `__tests__/hooks/useTutorial.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/hooks/useTutorial.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react'

const mockGetSessionPrefs = jest.fn().mockResolvedValue(null)
const mockSetSessionPrefs = jest.fn().mockResolvedValue(undefined)
const mockGetLessonProgress = jest.fn().mockResolvedValue(null)

jest.mock('@/lib/storage', () => ({
  getLessonProgress: (...args: unknown[]) => mockGetLessonProgress(...args),
  getSessionPrefs: () => mockGetSessionPrefs(),
  setSessionPrefs: (...args: unknown[]) => mockSetSessionPrefs(...args),
}))

jest.mock('@/lib/lessons', () => ({
  TUTORIALS: [
    {
      id: 'basic-datalog',
      title: 'Basic Datalog',
      description: '',
      goals: '',
      lessons: [
        {
          id: 'lesson-1',
          title: 'L1',
          description: '',
          steps: [{ id: 'l1-s1' }, { id: 'l1-s2' }],
        },
      ],
    },
    {
      id: 'marketplace',
      title: 'Marketplace',
      description: '',
      goals: '',
      prerequisiteTutorialId: 'basic-datalog',
      lessons: [
        {
          id: 'mp-lesson-1',
          title: 'MP L1',
          description: '',
          steps: [{ id: 'mp-s1' }],
        },
      ],
    },
  ],
}))

import { useTutorial } from '@/hooks/useTutorial'

beforeEach(() => {
  mockGetLessonProgress.mockResolvedValue(null)
  mockGetSessionPrefs.mockResolvedValue(null)
  mockSetSessionPrefs.mockClear()
})

describe('useTutorial', () => {
  it('basic-datalog is always unlocked', async () => {
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeTutorial?.id).toBe('basic-datalog'))
    expect(result.current.isUnlocked('basic-datalog')).toBe(true)
  })

  it('marketplace is locked when basic-datalog is incomplete', async () => {
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeTutorial).not.toBeNull())
    expect(result.current.isUnlocked('marketplace')).toBe(false)
  })

  it('marketplace unlocks when all basic-datalog steps are complete', async () => {
    mockGetLessonProgress.mockResolvedValue({ completedSteps: ['l1-s1', 'l1-s2'] })
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.completedStepsPerLesson['lesson-1']).toEqual(['l1-s1', 'l1-s2']))
    expect(result.current.isUnlocked('marketplace')).toBe(true)
  })

  it('switchTutorial persists activeTutorialId to session prefs', async () => {
    mockGetSessionPrefs.mockResolvedValue({ provider: 'groq', model: 'llama' })
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeTutorial).not.toBeNull())
    await act(async () => { result.current.switchTutorial('marketplace') })
    expect(mockSetSessionPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ activeTutorialId: 'marketplace' })
    )
  })

  it('defaults activeLessonId to first incomplete lesson', async () => {
    mockGetLessonProgress.mockResolvedValue({ completedSteps: ['l1-s1', 'l1-s2'] })
    // lesson-1 is fully complete; if there were a lesson-2 it would be first incomplete
    // With only one fully-complete lesson, falls back to first lesson
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeLessonId).toBe('lesson-1'))
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern="useTutorial" 2>&1 | tail -20
```

Expected: FAIL — `useTutorial` doesn't exist yet.

- [ ] **Step 3: Create `hooks/useTutorial.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import { TUTORIALS } from '@/lib/lessons'
import { getLessonProgress, getSessionPrefs, setSessionPrefs } from '@/lib/storage'
import type { Tutorial } from '@/lib/types'

export function useTutorial(initialTutorialId: string | null) {
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(
    initialTutorialId ?? TUTORIALS[0]?.id ?? null
  )
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [completedStepsPerLesson, setCompletedStepsPerLesson] = useState<
    Record<string, string[]>
  >({})

  const activeTutorial: Tutorial | null =
    TUTORIALS.find((t) => t.id === activeTutorialId) ?? null

  useEffect(() => {
    if (!activeTutorial) return
    Promise.all(
      activeTutorial.lessons.map((lesson) =>
        getLessonProgress(lesson.id).then(
          (p) => [lesson.id, p?.completedSteps ?? []] as const
        )
      )
    ).then((entries) => {
      const record = Object.fromEntries(entries)
      setCompletedStepsPerLesson((prev) => ({ ...prev, ...record }))
      const firstIncomplete =
        activeTutorial.lessons.find((lesson) => {
          const completed = record[lesson.id] ?? []
          return lesson.steps.some((step) => !completed.includes(step.id))
        }) ?? activeTutorial.lessons[0]
      setActiveLessonId(firstIncomplete?.id ?? null)
    })
  }, [activeTutorialId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isUnlocked = useCallback(
    (tutorialId: string): boolean => {
      const tutorial = TUTORIALS.find((t) => t.id === tutorialId)
      if (!tutorial) return false
      if (!tutorial.prerequisiteTutorialId) return true
      const prereq = TUTORIALS.find((t) => t.id === tutorial.prerequisiteTutorialId)
      if (!prereq) return true
      return prereq.lessons.every((lesson) =>
        lesson.steps.every((step) =>
          (completedStepsPerLesson[lesson.id] ?? []).includes(step.id)
        )
      )
    },
    [completedStepsPerLesson]
  )

  const switchTutorial = useCallback(async (tutorialId: string) => {
    setActiveTutorialId(tutorialId)
    const prefs = await getSessionPrefs()
    await setSessionPrefs({
      provider: prefs?.provider ?? 'groq',
      model: prefs?.model ?? 'llama-3.3-70b-versatile',
      mode: 'lessons',
      ...(prefs?.activeLessonId ? { activeLessonId: prefs.activeLessonId } : {}),
      activeTutorialId: tutorialId,
    })
  }, [])

  return {
    activeTutorial,
    activeLessonId,
    setActiveLessonId,
    switchTutorial,
    isUnlocked,
    completedStepsPerLesson,
    setCompletedStepsPerLesson,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern="useTutorial" 2>&1 | tail -20
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add hooks/useTutorial.ts __tests__/hooks/useTutorial.test.ts
git commit -m "feat: implement useTutorial hook with unlock logic and lesson resume"
```

---

### Task 8: Implement `TutorialSidebar` and remove `LessonSidebar`

**Files:**
- Create: `components/lessons/TutorialSidebar.tsx`
- Delete: `components/lessons/LessonSidebar.tsx`

- [ ] **Step 1: Create `components/lessons/TutorialSidebar.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { TUTORIALS } from '@/lib/lessons'
import type { Tutorial, Lesson } from '@/lib/types'

interface TutorialSidebarProps {
  activeTutorial: Tutorial | null
  activeLessonId: string | null
  completedStepsPerLesson: Record<string, string[]>
  currentStepIndex?: number
  totalSteps?: number
  isUnlocked: (tutorialId: string) => boolean
  onSelectLesson: (id: string) => void
  onSwitchTutorial: (id: string) => void
}

function isLessonComplete(lesson: Lesson, completedStepsPerLesson: Record<string, string[]>) {
  const completed = completedStepsPerLesson[lesson.id] ?? []
  return lesson.steps.length > 0 && lesson.steps.every((s) => completed.includes(s.id))
}

export function TutorialSidebar({
  activeTutorial,
  activeLessonId,
  completedStepsPerLesson,
  currentStepIndex = 0,
  totalSteps = 0,
  isUnlocked,
  onSelectLesson,
  onSwitchTutorial,
}: TutorialSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (collapsed) {
    return (
      <div
        className="w-6 border-r border-gray-800 flex items-start pt-3 justify-center cursor-pointer"
        onClick={() => setCollapsed(false)}
      >
        <span className="text-gray-600 text-xs rotate-90 whitespace-nowrap">
          Lessons ▶
        </span>
      </div>
    )
  }

  return (
    <div className="w-52 border-r border-gray-800 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full text-left text-xs text-blue-400 hover:text-blue-300 truncate mb-1"
        >
          Tutorial: {activeTutorial?.title ?? '—'} ▾
        </button>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ↩ Switch tutorial
        </button>
      </div>

      {/* Tutorial dropdown */}
      {dropdownOpen && (
        <div className="border-b border-gray-800 py-1">
          {TUTORIALS.map((tutorial) => {
            const unlocked = isUnlocked(tutorial.id)
            const active = tutorial.id === activeTutorial?.id
            const totalInTutorial = tutorial.lessons.reduce(
              (sum, l) => sum + l.steps.length,
              0
            )
            const completedInTutorial = tutorial.lessons.reduce(
              (sum, l) => sum + (completedStepsPerLesson[l.id] ?? []).length,
              0
            )
            const allComplete =
              totalInTutorial > 0 && completedInTutorial === totalInTutorial

            return (
              <button
                key={tutorial.id}
                disabled={!unlocked}
                title={
                  !unlocked
                    ? 'Complete Basic Datalog to unlock'
                    : undefined
                }
                onClick={() => {
                  if (!unlocked) return
                  onSwitchTutorial(tutorial.id)
                  setDropdownOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  active
                    ? 'text-blue-300 bg-blue-900/20'
                    : unlocked
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                {!unlocked ? '🔒 ' : allComplete ? '✓ ' : ''}
                {tutorial.title}
                {unlocked && !allComplete && totalInTutorial > 0 && (
                  <span className="ml-1 text-gray-600">
                    {completedInTutorial}/{totalInTutorial}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Lessons list */}
      <ul className="flex-1 overflow-y-auto py-2">
        {(activeTutorial?.lessons ?? []).map((lesson) => {
          const complete = isLessonComplete(lesson, completedStepsPerLesson)
          const active = lesson.id === activeLessonId
          return (
            <li key={lesson.id}>
              <button
                onClick={() => onSelectLesson(lesson.id)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {complete ? '● ' : active ? '→ ' : '○ '}
                {lesson.title}
              </button>
              {active && totalSteps > 0 && (
                <div className="px-3 pb-1 text-xs text-gray-600">
                  Step {currentStepIndex + 1}/{totalSteps}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-800 flex justify-end">
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-600 hover:text-white text-xs"
        >
          ◀
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete `LessonSidebar.tsx`**

```bash
git rm components/lessons/LessonSidebar.tsx
```

- [ ] **Step 3: Run tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all passing (no tests directly import `LessonSidebar`; AppShell tests mock the component).

- [ ] **Step 4: Commit**

```bash
git add components/lessons/TutorialSidebar.tsx
git commit -m "feat: add TutorialSidebar with inline dropdown switcher, remove LessonSidebar"
```

---

### Task 9: Update `AppShell` to wire `useTutorial`, `useMinigraf(tutorialId)`, and `TutorialSidebar`

**Files:**
- Modify: `components/layout/AppShell.tsx`
- Modify: `__tests__/components/AppShell.test.tsx`

- [ ] **Step 1: Update imports in `AppShell.tsx`**

Replace:
```ts
import { LessonSidebar } from '@/components/lessons/LessonSidebar'
import { useLesson } from '@/hooks/useLesson'
```
With:
```ts
import { TutorialSidebar } from '@/components/lessons/TutorialSidebar'
import { useLesson } from '@/hooks/useLesson'
import { useTutorial } from '@/hooks/useTutorial'
```

- [ ] **Step 2: Remove `LESSON_INTROS` and related state**

Delete the entire `LESSON_INTROS` constant (lines 30–35 of the original file).

Delete the `completedStepsPerLesson` state declaration:
```ts
const [completedStepsPerLesson, setCompletedStepsPerLesson] = useState<Record<string, string[]>>({})
```
(This is now owned by `useTutorial`.)

Delete the `activeLessonId` state declaration:
```ts
const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
```
(This is now owned by `useTutorial`.)

- [ ] **Step 3: Add `useTutorial` and update `useMinigraf` call**

After the `mode` state declaration, add:

```ts
const [activeTutorialId, setActiveTutorialIdState] = useState<string | null>(null)
```

Replace:
```ts
const { status, error: wasmError, query } = useMinigraf()
```
With:
```ts
const tutorialManager = useTutorial(activeTutorialId)
const { status, error: wasmError, query } = useMinigraf(
  mode === 'lessons' ? (tutorialManager.activeTutorial?.id ?? 'sandbox') : 'sandbox'
)
```

Pull `activeLessonId` and `completedStepsPerLesson` from the hook:
```ts
const { activeLessonId, completedStepsPerLesson } = tutorialManager
```

- [ ] **Step 4: Update the prefs-loading `useEffect`**

Find the effect that calls `getSessionPrefs()` (around line 86). Update it to also restore `activeTutorialId`:

```ts
useEffect(() => {
  getSessionPrefs().then((prefs) => {
    if (!hashAppliedRef.current) {
      if (prefs?.mode) {
        setMode(prefs.mode)
      }
      if (prefs?.activeTutorialId) {
        setActiveTutorialIdState(prefs.activeTutorialId)
      } else {
        setActiveTutorialIdState('basic-datalog')
      }
    }
    setSessionPrefsState(prefs)
    setPrefsLoaded(true)
  })
}, [])
```

- [ ] **Step 5: Update `handleActiveLessonChange` and `handleModeChange`**

Replace `handleActiveLessonChange`:
```ts
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
```

In `handleModeChange`, replace the `activeLessonId` references to use `tutorialManager.activeLessonId`:
```ts
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
```

- [ ] **Step 6: Remove the `completedStepsPerLesson` sync effect**

Delete this effect entirely (it was syncing `lessonRunner.completedSteps` into local state — `useTutorial` now owns this):

```ts
useEffect(() => {
  if (activeLessonId) {
    setCompletedStepsPerLesson((prev) => ({
      ...prev,
      [activeLessonId]: lessonRunner.completedSteps,
    }))
  }
}, [activeLessonId, lessonRunner.completedSteps])
```

Instead, after `lessonRunner` completes a step, propagate to `useTutorial`'s state. Add this effect:

```ts
useEffect(() => {
  if (activeLessonId && lessonRunner.completedSteps.length > 0) {
    tutorialManager.setCompletedStepsPerLesson((prev) => ({
      ...prev,
      [activeLessonId]: lessonRunner.completedSteps,
    }))
  }
}, [activeLessonId, lessonRunner.completedSteps]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 7: Replace `LessonSidebar` with `TutorialSidebar` in the JSX**

Find:
```tsx
<LessonSidebar
  activeLessonId={activeLessonId}
  completedStepsPerLesson={completedStepsPerLesson}
  currentStepIndex={lessonRunner.stepIndex}
  totalSteps={lessonRunner.totalSteps}
  onSelect={handleActiveLessonChange}
/>
```
Replace with:
```tsx
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
```

- [ ] **Step 8: Replace `LESSON_INTROS[activeLessonId]` in the `ChatPanel` JSX**

Find:
```tsx
introContext={mode === 'lessons' && activeLessonId ? {
  ...LESSON_INTROS[activeLessonId],
  currentStep: lessonRunner.currentStep?.instruction ?? undefined,
  completedOpenStep: pendingOpenStepContext ?? undefined,
} : undefined}
```
Replace with:
```tsx
introContext={mode === 'lessons' && activeLessonId && tutorialManager.activeTutorial ? {
  lessonTitle: lessonRunner.lesson?.title ?? '',
  lessonGoals: tutorialManager.activeTutorial.goals,
  currentStep: lessonRunner.currentStep?.instruction ?? undefined,
  completedOpenStep: pendingOpenStepContext ?? undefined,
} : undefined}
```

- [ ] **Step 9: Update `__tests__/components/AppShell.test.tsx` mocks**

Find any mock for `@/components/lessons/LessonSidebar` and replace with:
```ts
jest.mock('@/components/lessons/TutorialSidebar', () => ({
  TutorialSidebar: () => null,
}))
```

Find any mock for `@/hooks/useLesson` and confirm it still works (it should — `useLesson` is unchanged).

Add a mock for `@/hooks/useTutorial`:
```ts
jest.mock('@/hooks/useTutorial', () => ({
  useTutorial: () => ({
    activeTutorial: { id: 'basic-datalog', title: 'Basic Datalog', goals: '', lessons: [] },
    activeLessonId: null,
    setActiveLessonId: jest.fn(),
    switchTutorial: jest.fn(),
    isUnlocked: () => true,
    completedStepsPerLesson: {},
    setCompletedStepsPerLesson: jest.fn(),
  }),
}))
```

Add a mock for `@/hooks/useMinigraf` that accepts a `tutorialId` parameter:
```ts
jest.mock('@/hooks/useMinigraf', () => ({
  useMinigraf: (_tutorialId: string) => ({
    status: 'ready',
    error: null,
    query: jest.fn().mockResolvedValue({ columns: [], rows: [], executionTimeMs: 0 }),
  }),
}))
```

- [ ] **Step 10: Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all passing.

- [ ] **Step 11: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, clean build.

- [ ] **Step 12: Commit**

```bash
git add components/layout/AppShell.tsx __tests__/components/AppShell.test.tsx
git commit -m "feat: wire useTutorial, TutorialSidebar, and per-tutorial useMinigraf into AppShell"
```
