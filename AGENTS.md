# Agent Guidelines — Minigraf Playground

This file tells AI coding agents everything they need to know to pick up an issue and implement it correctly.

---

## Project Overview

Minigraf Playground is a browser-based interactive tutorial for [Minigraf](https://github.com/adityamukho/minigraf) — a tiny embedded graph database with Datalog querying and bi-temporal time travel. It runs Minigraf's WASM module in the browser, with an AI tutor powered by the user's own LLM API key (BYOK) or a Groq-based anonymous fallback.

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Vercel AI SDK, CodeMirror 6, React Flow, IndexedDB (`idb`)

**Hosted on:** Vercel (Hobby tier)

---

## Key Documents

Read these before starting any issue:

- **Design spec:** `docs/superpowers/specs/2026-04-20-minigraf-playground-design.md` — architecture, layout decisions, privacy model, milestone breakdown
- **Implementation plan:** `docs/superpowers/plans/2026-04-20-minigraf-playground.md` — 26 tasks with files, code, tests, and commits; your issue maps directly to one task in this plan

---

## Before You Start an Issue

1. **Read the task** in the implementation plan that matches your issue number (e.g. issue "2.3 — Results table panel" → Task 2.3 in the plan).
2. **Check dependencies.** Earlier milestone tasks must be complete before later ones. Foundation (1.x) before Core UX (2.x) before AI Tutor (3.x) before Lessons (4.x) before Polish (5.x).
3. **Run `npm install`** if `node_modules` is absent.
4. **Run `npm run postinstall`** if `public/wasm/` is absent — this downloads the Minigraf WASM binary.
5. **Run existing tests** to confirm the baseline is green: `npm test`

---

## Coding Rules

### General

- **TypeScript everywhere.** No `any` unless there is a clear documented reason.
- **Shared types live in `lib/types.ts`.** Do not define duplicate types in component or hook files.
- **All user data stays local.** Never add code that sends API keys, graph state, chat history, or lesson progress to any server. The proxy route (`app/api/chat/route.ts`) only receives what is explicitly passed by the client and documented in the plan.
- **No new dependencies** without a clear reason. Prefer what is already installed. If you must add one, note it in the PR description.
- **No `console.log` in committed code** unless it is a deliberate warning (use `console.warn`).

### File structure

Follow the layout in `docs/superpowers/plans/2026-04-20-minigraf-playground.md` — File Structure section. Put components in `components/`, hooks in `hooks/`, library code in `lib/`. Do not create new top-level directories.

### Components

- Use `'use client'` only for components that need browser APIs or React state. Server components are preferred where possible.
- Tailwind only for styling — no CSS modules, no inline `style` except for dynamic values (e.g. panel widths from state).
- Keep components focused. If a component grows past ~150 lines, consider splitting.

### API route

- The chat route at `app/api/chat/route.ts` must remain an Edge runtime function (`export const runtime = 'edge'`).
- Never log the contents of `userKey` or any API key.

---

## Testing Rules

- **Write the failing test first, then implement.** This is required for all `lib/` code and hooks.
- Tests live in `__tests__/` mirroring the source path: `lib/storage.ts` → `__tests__/lib/storage.test.ts`.
- Use `fake-indexeddb/auto` (already in `jest.setup.ts`) for IndexedDB tests — do not mock IndexedDB manually.
- Mock the WASM module in hook tests — do not require the actual WASM binary in tests.
- Run tests with `npm test`. All tests must pass before committing.
- Do not delete or skip existing passing tests.

---

## Commit Rules

- One logical commit per task. Use the commit message format from the plan.
- Commit message prefix: `feat:` for new functionality, `fix:` for bug fixes, `chore:` for config/tooling, `docs:` for documentation.
- Stage only the files changed by your task. Do not use `git add -A` if it would include unrelated files.
- Do not amend previous commits.

---

## WASM API

The Minigraf WASM module is downloaded to `public/wasm/` by `npm run postinstall`. Before implementing `hooks/useMinigraf.ts` (Task 1.4) or any lesson content (Tasks 4.3–4.6), inspect the `.d.ts` file in `public/wasm/` to confirm the actual exported API. Do not invent method names — use exactly what the `.d.ts` declares.

```bash
cat public/wasm/*.d.ts
```

---

## Privacy Constraints (non-negotiable)

These must never be violated:

1. API keys stored in IndexedDB are never sent to the app's own server. They are only ever sent directly to the provider's API (client-side) or via the proxy route where the user explicitly passes their own key.
2. The proxy route must not log, store, or forward API keys beyond the single in-flight request.
3. The anon fallback token cap must be enforced — do not remove or bypass it.
4. The first-visit privacy modal must remain gated on `localStorage` — do not remove the gate.

---

## Definition of Done

An issue is complete when:

- [ ] All files listed in the plan task are created or modified as specified
- [ ] Tests pass: `npm test`
- [ ] App builds without errors: `npm run build`
- [ ] The feature works in the browser: `npm run dev` and verify manually
- [ ] Commit made with the message format from the plan
- [ ] No unrelated files changed
