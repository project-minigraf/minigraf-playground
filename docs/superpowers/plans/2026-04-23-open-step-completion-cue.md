# Open-Step Completion Cue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user completes an open-ended lesson step, the AI tutor's next intro message acknowledges their work before introducing the next task.

**Architecture:** AppShell captures the just-completed open-ended step's instruction and the current editor code into `pendingOpenStepContext` state immediately before `submitResult` advances the step. A clearing `useEffect` (keyed on `lessonIntroTrigger`) ensures this state is present for exactly one render — the one in which ChatPanel's intro effect fires for the next step. `buildIntroPrompt` is extended to emit a combined ack + intro prompt when `completedOpenStep` is present in `introContext`.

**Tech Stack:** React 18 (state batching), Next.js 15 App Router, TypeScript

---

## File Map

| File | Change |
|------|--------|
| `__tests__/components/AppShell.test.tsx` | Update QueryEditor mock to expose `onResult`; add 2 tests |
| `components/chat/ChatPanel.tsx` | Extend `introContext` type; update `buildIntroPrompt` |
| `components/layout/AppShell.tsx` | Add `pendingOpenStepContext` state + clearing effect; set in `handleResult`; pass to `introContext` |

---

### Task 1: Write failing tests

**Files:**
- Modify: `__tests__/components/AppShell.test.tsx`

The existing `next/dynamic` mock renders `<div>QueryEditor</div>`. Update it to render a button that fires `onResult` when clicked. This lets tests simulate the user running a query. Then add two tests: one verifying that `completedOpenStep` appears in `introContext` when the current step is open-ended, and one verifying it is absent when the step has `expectedResult`.

- [ ] **Step 1: Update the `next/dynamic` mock**

Replace the existing mock at the top of `__tests__/components/AppShell.test.tsx`:

```tsx
// BEFORE:
jest.mock('next/dynamic', () => () => function MockQueryEditor() {
  return <div>QueryEditor</div>
})

// AFTER:
jest.mock('next/dynamic', () => () => function MockQueryEditor({
  onResult,
}: {
  onResult?: (result: { columns: string[]; rows: string[][]; executionTimeMs: number }, code?: string) => void
}) {
  return (
    <div>
      <button
        data-testid="run-query"
        onClick={() => onResult?.({ columns: [], rows: [], executionTimeMs: 1 }, '(transact [[:a :b :c]])')}
      >
        Run
      </button>
    </div>
  )
})
```

- [ ] **Step 2: Add the two new tests**

Add inside the existing `describe('AppShell lesson intro trigger', ...)` block, after the last `it(...)`:

```tsx
it('passes completedOpenStep into introContext when an open-ended step completes', async () => {
  mockLessonRunner = {
    ...mockLessonRunner,
    currentStep: {
      id: 'step-open',
      instruction: 'Model your own dataset.',
      starterCode: '',
      hints: [],
      successMessage: 'Great!',
      // no expectedResult → open-ended
    },
    submitResult: jest.fn().mockResolvedValue(true),
  }

  const { getByTestId } = render(<AppShell />)
  await waitFor(() => expect(chatPanelSpy).toHaveBeenCalled())

  await act(async () => {
    fireEvent.click(getByTestId('run-query'))
  })

  await waitFor(() => {
    const latestProps = chatPanelSpy.mock.calls.at(-1)?.[0] as {
      introContext?: { completedOpenStep?: { instruction: string; code: string } }
    }
    expect(latestProps.introContext?.completedOpenStep).toEqual({
      instruction: 'Model your own dataset.',
      code: expect.any(String),
    })
  })
})

it('does not pass completedOpenStep when the current step has an expectedResult', async () => {
  mockLessonRunner = {
    ...mockLessonRunner,
    currentStep: {
      id: 'step-1',
      instruction: 'Step 1',
      starterCode: '(query [:find ?x :where [:alice :friend ?x]])',
      hints: [],
      successMessage: 'ok',
      expectedResult: { columns: ['?x'], rows: [[':bob']] },
    },
    submitResult: jest.fn().mockResolvedValue(true),
  }

  const { getByTestId } = render(<AppShell />)
  await waitFor(() => expect(chatPanelSpy).toHaveBeenCalled())

  await act(async () => {
    fireEvent.click(getByTestId('run-query'))
  })

  await waitFor(() => {
    const latestProps = chatPanelSpy.mock.calls.at(-1)?.[0] as {
      introContext?: { completedOpenStep?: unknown }
    }
    expect(latestProps.introContext?.completedOpenStep).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run the new tests to confirm they fail**

```bash
npx jest __tests__/components/AppShell.test.tsx --no-coverage
```

Expected: the two new tests FAIL (completedOpenStep is undefined / present when it shouldn't be). Existing three tests pass.

---

### Task 2: Extend ChatPanel's introContext type and buildIntroPrompt

**Files:**
- Modify: `components/chat/ChatPanel.tsx:80-108`

Two changes in this file:
1. `buildIntroPrompt` gains two new prompt branches — one for mid-lesson completion (next step exists), one for end-of-lesson completion.
2. The `introContext` type in `ChatPanelProps` gains an optional `completedOpenStep` field.

- [ ] **Step 4: Update `buildIntroPrompt`**

Replace lines 80–96 (`function buildIntroPrompt` through its closing brace):

```ts
function buildIntroPrompt(
  introContext: { lessonTitle?: string; lessonGoals?: string; currentStep?: string; completedOpenStep?: { instruction: string; code: string } } | undefined,
  isFirstConversationMessage: boolean
): string {
  if (introContext?.completedOpenStep) {
    const { instruction, code } = introContext.completedOpenStep
    if (introContext.currentStep) {
      return `The user just finished the open-ended step below and ran this code. In 1-2 sentences, briefly acknowledge what they built. Then in 1-2 sentences, introduce the next step. Do not re-introduce yourself or greet them again.\n\nCompleted step: ${instruction}\n\nTheir code:\n\`\`\`datalog\n${code}\n\`\`\`\n\nNext task: ${introContext.currentStep}`
    }
    return `The user just finished the final open-ended step below and ran this code. In 2-3 sentences, acknowledge what they built and congratulate them on completing the lesson. Do not re-introduce yourself.\n\nCompleted step: ${instruction}\n\nTheir code:\n\`\`\`datalog\n${code}\n\`\`\``
  }
  if (introContext?.lessonTitle) {
    const goalsLine = introContext.lessonGoals ? ` It covers: ${introContext.lessonGoals}.` : ''
    const stepLine = introContext.currentStep ? `\n\nThe user's current task is:\n${introContext.currentStep}` : ''
    if (isFirstConversationMessage) {
      return `The user is starting the lesson "${introContext.lessonTitle}".${goalsLine}${stepLine}\n\nIn 2-3 sentences, introduce yourself once, describe what they will learn, and guide them through the current task.`
    }
    return `The user is continuing the lesson "${introContext.lessonTitle}".${goalsLine}${stepLine}\n\nIn 1-2 sentences, guide them through the current task. Do not re-introduce yourself, greet them again, or repeat a generic tutor opening.`
  }
  if (isFirstConversationMessage) {
    return 'In 2-3 sentences, introduce yourself as a friendly Minigraf tutor. Briefly mention that Minigraf supports Datalog querying and bi-temporal time travel, and invite the user to ask questions or start experimenting.'
  }
  return 'In 1-2 sentences, continue helping the user in the sandbox. Do not re-introduce yourself, greet them again, or repeat a generic tutor opening.'
}
```

- [ ] **Step 5: Update the `introContext` type in `ChatPanelProps`**

Replace line 108:

```ts
// BEFORE:
  introContext?: { lessonTitle?: string; lessonGoals?: string; currentStep?: string }

// AFTER:
  introContext?: { lessonTitle?: string; lessonGoals?: string; currentStep?: string; completedOpenStep?: { instruction: string; code: string } }
```

---

### Task 3: Update AppShell to capture and pass completion context

**Files:**
- Modify: `components/layout/AppShell.tsx`

Three changes:
1. Add `pendingOpenStepContext` state.
2. Add a `useEffect` that clears it whenever `lessonIntroTrigger` changes (runs after the render in which the intro fires, so the intro sees the value, then it's cleared for the next cycle).
3. Set it in `handleResult` before calling `submitResult`, and pass it to `introContext`.

- [ ] **Step 6: Add `pendingOpenStepContext` state**

In `AppShell`, after the existing state declarations (around line 49, after `const [prefsLoaded, setPrefsLoaded] = useState(false)`), add:

```ts
const [pendingOpenStepContext, setPendingOpenStepContext] = useState<{ instruction: string; code: string } | null>(null)
```

- [ ] **Step 7: Add clearing useEffect**

After the existing `lessonIntroTrigger` declaration (around line 134–137), add:

```ts
useEffect(() => {
  setPendingOpenStepContext(null)
}, [lessonIntroTrigger])
```

- [ ] **Step 8: Set `pendingOpenStepContext` in `handleResult`**

In `handleResult` (around line 148), add the following block immediately before the existing `if (mode === 'lessons' && activeLessonId)` check:

```ts
if (mode === 'lessons' && lessonRunner.currentStep && !lessonRunner.currentStep.expectedResult) {
  setPendingOpenStepContext({ instruction: lessonRunner.currentStep.instruction, code: editorValue })
}
```

The full updated `handleResult` callback body should look like:

```ts
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
```

Note: `editorValue` is added to the `useCallback` dependency array.

- [ ] **Step 9: Pass `completedOpenStep` into `introContext`**

In the `ChatPanel` JSX (around line 255), update `introContext`:

```tsx
// BEFORE:
introContext={mode === 'lessons' && activeLessonId ? {
  ...LESSON_INTROS[activeLessonId],
  currentStep: lessonRunner.currentStep?.instruction ?? undefined,
} : undefined}

// AFTER:
introContext={mode === 'lessons' && activeLessonId ? {
  ...LESSON_INTROS[activeLessonId],
  currentStep: lessonRunner.currentStep?.instruction ?? undefined,
  completedOpenStep: pendingOpenStepContext ?? undefined,
} : undefined}
```

---

### Task 4: Run all tests

- [ ] **Step 10: Run the full test suite**

```bash
npm test
```

Expected: all tests pass including the two new ones. If the new tests still fail, check:
- That `mode` resolves to `'lessons'` by the time `run-query` is clicked (the `getSessionPrefs` mock returns `{ mode: 'lessons' }`; `waitFor(() => expect(chatPanelSpy).toHaveBeenCalled())` should be enough to ensure this).
- That `lessonRunner.currentStep` in AppShell is the mock's `currentStep` (which it is, since `useLesson` is mocked to return `mockLessonRunner`).
- That `editorValue` is `DEFAULT_CODE` (no `starterCode` effect fires because `starterCode` is `''` in the open-ended mock); `code: expect.any(String)` in the test accepts any string so this is fine.

---

### Task 5: Commit

- [ ] **Step 11: Stage and commit**

```bash
git add components/chat/ChatPanel.tsx components/layout/AppShell.tsx __tests__/components/AppShell.test.tsx
git commit -m "feat: show tutor ack when open-ended lesson step completes"
```

---

## Self-Review

**Spec coverage:**
- ✓ Open-ended step completion triggers an LLM message acknowledging the user's work (via merged ack + intro prompt)
- ✓ Mid-lesson case (next step exists) covered in `buildIntroPrompt`
- ✓ End-of-lesson case (no next step) covered in `buildIntroPrompt`
- ✓ Only fires for open-ended steps (steps without `expectedResult`)
- ✓ `pendingOpenStepContext` clears after one intro cycle
- ✓ Sandbox mode unaffected (guarded by `mode === 'lessons'`)
- ✓ Steps with `expectedResult` unaffected

**Placeholder scan:** No TBDs, no "similar to" references, all code blocks complete.

**Type consistency:**
- `completedOpenStep: { instruction: string; code: string }` used consistently in `buildIntroPrompt` signature, `ChatPanelProps`, AppShell state, and AppShell introContext.
- `pendingOpenStepContext` state type matches what's passed to `completedOpenStep` via `?? undefined` spread.
- `editorValue` added to `handleResult`'s `useCallback` dependency array.
