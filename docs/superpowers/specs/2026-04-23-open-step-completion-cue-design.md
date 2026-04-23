# Open-Step Completion Cue — Design Spec

**Date:** 2026-04-23
**Status:** Approved

---

## Problem

Open-ended lesson steps (steps with no `expectedResult`) are auto-completed as soon as the user runs any query. The next step or lesson unlocks silently: the step advances and the intro for the next step fires, but the tutor never explicitly acknowledges that the user passed the completed step. Users may not realize they have cleared the step and are free to continue or keep practising.

---

## Goal

When an open-ended step completes, the tutor's intro message for the next step becomes a combined acknowledgment + introduction: the LLM briefly recognises what the user built, confirms the step is done, and then introduces the next task. No extra LLM call; no new UI elements; no sequencing complexity.

---

## Approach: Merge ack into the next-step intro (single LLM call)

The existing intro mechanism already fires an LLM call whenever `lessonIntroTrigger` changes (i.e., whenever the current step changes). We enrich that call's prompt with context about the just-completed open-ended step so the model can open with an acknowledgment before pivoting to the next task.

### Why not a separate ack call?

Two concurrent LLM calls (one ack, one intro) would require either gating logic in AppShell or an internal queue in ChatPanel. The merged approach avoids all of that: one call, one message, zero sequencing overhead.

---

## Data Flow

```
User runs query on open-ended step
  │
  ▼
handleResult (AppShell)
  ├─ setPendingOpenStepContext({ instruction, code })   ← capture before advance
  └─ await lessonRunner.submitResult(result)
       └─ setStepIndex(i + 1)                          ← step advances

React batches both state updates → single re-render
  │
  ▼
lessonIntroTrigger changes (new step id)
introContext now includes completedOpenStep

  │
  ▼
ChatPanel intro useEffect fires
  └─ buildIntroPrompt sees completedOpenStep → enriched prompt → LLM call

After the render, AppShell useEffect clears pendingOpenStepContext
(keyed on lessonIntroTrigger changes, so it only applies once)
```

---

## Prompt Construction

`buildIntroPrompt` in `ChatPanel.tsx` is extended. When `introContext.completedOpenStep` is present:

**Mid-lesson (next step exists):**
> The user just finished the open-ended step below and ran this code. In 1–2 sentences, briefly acknowledge what they built. Then in 1–2 sentences, introduce the next step. Do not re-introduce yourself or greet them again.
>
> Completed step: `[instruction]`
>
> Their code:
> ` ```datalog `
> `[code]`
> ` ``` `
>
> Next task: `[currentStep instruction]`

**Lesson complete (no next step):**
> The user just finished the final open-ended step below and ran this code. In 2–3 sentences, acknowledge what they built and congratulate them on completing the lesson. Do not re-introduce yourself.
>
> Completed step: `[instruction]`
>
> Their code:
> ` ```datalog `
> `[code]`
> ` ``` `

All existing non-open-ended intro prompt branches are unchanged.

---

## Files Changed

| File | Change |
|------|--------|
| `components/chat/ChatPanel.tsx` | Extend `introContext` prop type to include `completedOpenStep?: { instruction: string; code: string }`; update `buildIntroPrompt` with two new prompt branches. |
| `components/layout/AppShell.tsx` | Add `pendingOpenStepContext` state; add `useEffect` to clear it on each `lessonIntroTrigger` change; set it in `handleResult` when the current step has no `expectedResult`; pass `completedOpenStep` into `introContext`. |
| `__tests__/components/AppShell.test.tsx` | Add tests verifying `pendingOpenStepContext` is populated for open-ended step completion and not populated for steps with `expectedResult`. |

No new files. No new dependencies. `lib/types.ts` is unchanged (the `introContext` type is inline in both components).

---

## Invariants

- `pendingOpenStepContext` is only non-null for one render cycle — the one in which `lessonIntroTrigger` changes due to an open-ended step completion.
- The clearing `useEffect` runs after every `lessonIntroTrigger` change, so stale context cannot bleed into a later step's intro.
- Steps with `expectedResult` are unaffected: `pendingOpenStepContext` is never set for them.
- Sandbox mode is unaffected: `pendingOpenStepContext` is only set when `mode === 'lessons'`.

---

## Out of Scope

- Displaying `successMessage` in the UI (field exists but is not used; remains unused).
- Any visual indicator (toast, banner) separate from the chat panel.
- Changes to the 64-token `max_tokens` cap in `getProviderBody`.
