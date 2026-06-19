# Multi-Tutorial UI Design

**Date:** 2026-06-19
**Status:** Approved
**Related issues:** #28 (Marketplace), #29 (Org Chart), #30 (Sports League), #31 (Transit)

---

## Overview

Minigraf Playground currently supports a single implicit tutorial (Basic Datalog, lessons 1–4). This design adds four storyline-based tutorials and the UI infrastructure to navigate between them. The existing lesson runner, step progression, and progress storage are unchanged — a new `Tutorial` layer is added above them.

---

## Design Decisions Established in Brainstorming

| Question | Decision |
|---|---|
| Tutorial navigation in UI | Dropdown switcher in sidebar header (not a separate picker screen or navbar control) |
| Lessons mode entry point | Resume last active session; sidebar always shows a "Switch tutorial" shortcut above the step list |
| Tutorial unlock model | Basic Datalog is the single prerequisite; completing it unlocks all four storyline tutorials simultaneously, with no ordering between them |
| Fact isolation between tutorials | Separate named IndexedDB databases per tutorial via `BrowserDb.open('minigraf-<tutorialId>')` |
| WASM instance caching | LRU cache with `MAX_CACHED_INSTANCES = 2`; evicted instances are closed to release memory; re-entry recovers graph state from persistent IDB |

---

## Section 1 — Data Model

### New type: `Tutorial` (`lib/types.ts`)

```ts
type Tutorial = {
  id: string
  title: string
  description: string
  goals: string                      // used in AI tutor system prompt; replaces hardcoded LESSON_INTROS
  prerequisiteTutorialId?: string    // undefined = always unlocked
  lessons: Lesson[]
}
```

`Lesson` and `LessonStep` are unchanged.

### Lesson registry restructure (`lib/lessons/`)

```
lib/lessons/
  schema.ts                    (unchanged — re-exports types from lib/types.ts)
  lesson-1.ts                  (unchanged)
  lesson-2.ts                  (unchanged)
  lesson-3.ts                  (unchanged)
  lesson-4.ts                  (unchanged)
  tutorial-basic-datalog.ts    (new — wraps lesson-1..4, no prerequisiteTutorialId)
  tutorial-marketplace.ts      (new — issue #28, prerequisiteTutorialId: 'basic-datalog')
  tutorial-org-chart.ts        (new — issue #29, prerequisiteTutorialId: 'basic-datalog')
  tutorial-sports-league.ts    (new — issue #30, prerequisiteTutorialId: 'basic-datalog')
  tutorial-transit.ts          (new — issue #31, prerequisiteTutorialId: 'basic-datalog')
  index.ts                     (updated — exports TUTORIALS: Tutorial[])
```

`LESSONS` is replaced by `TUTORIALS`. Lesson IDs must remain globally unique across all tutorials.

### Unlock logic

A tutorial is unlocked when:
- It has no `prerequisiteTutorialId`, **or**
- For every `lesson` in the prerequisite tutorial's `lessons` array, every `step.id` in `lesson.steps` is present in `completedStepsPerLesson[lesson.id]`

In other words: the prerequisite tutorial is considered complete only when every step of every lesson in it has been submitted and recorded.

### `LESSON_INTROS` removal

The hardcoded `LESSON_INTROS` record in `AppShell.tsx` is deleted. Tutorial intro context for the AI tutor is sourced from `tutorial.goals` and `lesson.title`/`lesson.description` instead, co-located with the content.

### `SessionPrefs` (`lib/types.ts`)

One field added:
```ts
activeTutorialId?: string
```

---

## Section 2 — WASM / IDB Isolation

### `lib/wasm-loader.ts`

```ts
import init, { BrowserDb } from '@minigraf/browser'

export async function loadMinigraf(dbName: string) {
  await init()
  return BrowserDb.open(dbName)
}
```

The `dbName` parameter is the only change. Sandbox mode uses `BrowserDb.open('minigraf-sandbox')` — a deliberate rename from the current hardcoded `'minigraf'`. This is a one-time breaking change: any facts a user transacted in sandbox mode before this change will not carry over. Since sandbox state is ephemeral and tutorial-by-design, this is acceptable and requires no migration.

### `hooks/useMinigraf.ts` — LRU instance cache

```ts
const MAX_CACHED_INSTANCES = 2

const instanceCache = new Map<string, { promise: Promise<unknown>, lastUsed: number }>()

function evictLRUIfNeeded() {
  if (instanceCache.size < MAX_CACHED_INSTANCES) return
  const lru = [...instanceCache.entries()]
    .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)[0]
  lru[1].promise.then(inst => (inst as { close(): void }).close?.())
  instanceCache.delete(lru[0])
}

export function useMinigraf(tutorialId: string) {
  const dbName = `minigraf-${tutorialId}`
  if (!instanceCache.has(tutorialId)) {
    evictLRUIfNeeded()
    instanceCache.set(tutorialId, { promise: loadMinigraf(dbName), lastUsed: Date.now() })
  } else {
    instanceCache.get(tutorialId)!.lastUsed = Date.now()
  }
  // ... rest of hook unchanged
}
```

When an evicted tutorial is re-entered, a fresh WASM instance opens the same named IDB. Because IDB is persistent, all previously transacted facts are recovered automatically — no step replay needed.

**Note:** Verify that `BrowserDb` exposes a `close()` method in the `@minigraf/browser` type definitions before implementation. Adjust teardown call if the method name differs.

---

## Section 3 — Hooks

### `hooks/useLesson.ts` — unchanged

Manages step progression and progress persistence for a single lesson, keyed by `lessonId`. No modifications.

### New `hooks/useTutorial.ts`

Sits above `useLesson` in the component hierarchy. Responsibilities:

- Resolves the active `Tutorial` from `TUTORIALS`
- On mount, loads `completedStepsPerLesson` from IDB for all lessons of the active tutorial (needed to determine resume position and unlock status)
- Determines the active lesson within that tutorial (defaults to first lesson whose steps are not all complete)
- Exposes tutorial unlock status for all tutorials
- Handles `switchTutorial(id)` — updates `activeTutorialId` in `SessionPrefs`, reloads progress for the new tutorial's lessons

```ts
export function useTutorial(activeTutorialId: string | null): {
  activeTutorial: Tutorial | null
  activeLessonId: string | null
  setActiveLessonId: (id: string) => void
  switchTutorial: (id: string) => void
  isUnlocked: (tutorialId: string) => boolean
  completedStepsPerLesson: Record<string, string[]>
}
```

### `AppShell.tsx`

- Replaces direct `useLesson` call with `useTutorial`
- Passes `activeTutorial.id` to `useMinigraf` when in lessons mode; passes `'sandbox'` when in sandbox mode
- Removes `LESSON_INTROS` and sources intro context from `Tutorial.goals` and `Lesson` fields
- `activeTutorialId` persisted to `SessionPrefs` on switch

---

## Section 4 — Components

### `components/lessons/TutorialSidebar.tsx` (replaces `LessonSidebar.tsx`)

Layout:

```
┌──────────────────────────────┐
│ [Tutorial: Basic Datalog ▾]  │  ← dropdown trigger
│  ↩ Switch tutorial           │  ← always-visible shortcut
├──────────────────────────────┤
│ Lessons                      │
│  ● Lesson 1: Basic Facts ✓   │
│  → Lesson 2: Rules (active)  │
│    Step 3 / 4                │  ← step counter for active lesson only
│  ○ Lesson 3: Recursive       │
│  ○ Lesson 4: Bi-temporal     │
├──────────────────────────────┤
│                          [◀] │  ← collapse
└──────────────────────────────┘
```

**Tutorial dropdown** (inline, below header):
- Lists all tutorials with completion badge (✓), progress bar (started but incomplete), or lock icon (🔒)
- Locked tutorials show a tooltip: "Complete Basic Datalog to unlock"
- Not a native `<select>` — styled list, consistent with the dark UI theme

**Collapsed state** — unchanged: narrow `w-6` rail with rotated label.

### `components/layout/NavBar.tsx` — unchanged

Tutorial switching is a sidebar concern, not a navbar concern.

### No new modals

The dropdown handles tutorial selection inline — no additional modal surface.

---

## Section 5 — Testing

### Unchanged tests

`useLesson`, `storage`, `system-prompt` test files require no changes.

### Updated tests

**`__tests__/lib/lessons.test.ts`**
- Assert against `TUTORIALS: Tutorial[]` instead of `LESSONS`
- Verify `basic-datalog` has no `prerequisiteTutorialId`
- Verify all other tutorials have `prerequisiteTutorialId: 'basic-datalog'`
- Verify lesson IDs are globally unique across all tutorials

### New tests

**`__tests__/hooks/useTutorial.test.ts`**
- Tutorial with no prerequisite is always unlocked
- Tutorial with prerequisite is locked until all steps of `basic-datalog` are in `completedStepsPerLesson`
- Completing `basic-datalog` unlocks all four remaining tutorials simultaneously
- `switchTutorial` persists `activeTutorialId` to `SessionPrefs`
- Active lesson defaults to first incomplete lesson on tutorial entry
- WASM mocked per tutorial ID (same pattern as existing `useLesson` tests)

**`__tests__/hooks/useMinigraf.test.ts`**
- With `MAX_CACHED_INSTANCES = 2`, opening a third tutorial evicts the LRU instance
- `close()` is called on the evicted instance
- Re-entering an evicted tutorial creates a fresh instance against the same DB name

---

## Out of Scope

- Lesson content for issues #28–#31 (covered by their respective issues)
- Any changes to the results panel, query editor, chat panel, or AI tutor logic
- Cross-tutorial progress dashboards or aggregate statistics
- Lesson ordering within the four storyline tutorials (all linear, handled by existing `useLesson`)
