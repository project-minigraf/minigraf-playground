# Minigraf Playground — Design Spec

**Date:** 2026-04-20
**Status:** Approved

---

## Overview

A web-based interactive tutorial and sandbox for [Minigraf](https://github.com/adityamukho/minigraf) — a tiny embedded graph database with Datalog querying and bi-temporal time travel. The playground runs entirely in the browser using Minigraf's pre-built WASM module, with an AI tutor powered by the user's own LLM API key (BYOK) or an anonymous free-tier fallback.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| LLM integration | Vercel AI SDK (`ai` + `@ai-sdk/*`) |
| Code editor | CodeMirror 6 |
| Graph visualization | React Flow |
| Persistence | IndexedDB (local-only, no server storage) |
| Hosting | Vercel (Hobby tier) |
| Minigraf WASM | Pre-built tarball from GitHub release, vendored to `public/wasm/` at build time |

---

## Architecture

### WASM Loading

The Minigraf WASM tarball (`minigraf-browser-wasm.tar.gz`) is downloaded from the GitHub release URL at build time via a `postinstall` script and unpacked to `public/wasm/`. The pinned version is stored in `wasm.config.json`. `public/wasm/` is gitignored.

A singleton hook (`hooks/useMinigraf.ts`) loads the WASM module on app init, initializes the Minigraf instance, and exposes a `query(datalog: string): Promise<QueryResult>` API with loading/ready/error states.

### Persistence (IndexedDB)

All user data is stored locally in IndexedDB via `lib/storage.ts`. No user data is ever sent to app servers. Stores:

- `graph_state` — current graph contents (Sandbox mode)
- `session_prefs` — provider, model selection
- `api_keys` — user-provided LLM API keys
- `lesson_progress` — completed steps per lesson
- `chat_history` — chat messages, keyed by `lesson_id` or `"sandbox"`

### Layout

Split-pane layout with two main columns:

- **Left (2/3):** CodeMirror editor (top) + results panel (bottom, with table/graph toggle)
- **Right (1/3):** AI tutor chat panel

Top nav bar contains: Minigraf logo, Lessons/Sandbox mode toggle, settings icon.

In **Lessons mode**, a collapsible lesson sidebar appears on the far left listing lesson titles and step progress.

### AI Tutor Architecture

**Proxy route:** `app/api/chat/route.ts` (Vercel edge function, Vercel AI SDK `streamText`).
- If request includes a user API key: proxy to the chosen provider using that key.
- Otherwise: fall back to Groq (`llama-3.3-70b-versatile`) using `GROQ_API_KEY` env var.
- Anon fallback enforces a per-session token cap via signed cookie; returns `429` with user-facing message when exhausted.

**Validate → Diff → Narrate loop** (`lib/tutor.ts`):
1. **Validate** — run the user's query against the WASM instance; capture parse errors, runtime errors, or result set.
2. **Diff** — if the current lesson step has an expected result, compute the symmetric difference (missing tuples, unexpected tuples) between actual and expected.
3. **Narrate** — construct the LLM prompt from: system prompt, user's query source, diagnostic output or diff summary (never raw full result sets), and conversation history. Send to proxy route.

**System prompt** (`lib/system-prompt.ts`):
- Stable prefix: Minigraf Datalog syntax reference, tutor persona, hints-not-solutions policy.
- Dynamic suffix: current lesson step goal, user progress.
- Designed for prompt caching to minimize token costs.

### Multi-Provider Support

Settings drawer (triggered from nav) allows users to:
- Select provider: Gemini, Anthropic, OpenAI, xAI
- Select model (hardcoded list per provider)
- Enter and test API key
- Clear saved key

Keys stored in IndexedDB `api_keys`. A visible callout states keys are never sent to app servers.

When no key is set, anon fallback is used with a banner nudging the user to BYOK for better/faster responses.

### Modes

**Sandbox mode:** Freeform editor. Graph state persists to IndexedDB. Chat history keyed as `"sandbox"`.

**Lessons mode:** Structured curriculum of 4 lessons. Lesson runner (`hooks/useLesson.ts`) manages step state, loads starter code into editor, checks results against expected output, advances on success, persists progress. Chat history keyed per lesson step.

---

## Lesson Curriculum

| Lesson | Topic |
|---|---|
| 1 | Basic facts and queries |
| 2 | Rules and inference |
| 3 | Recursive rules |
| 4 | Bi-temporal time travel |

Each lesson is defined as static TypeScript data using the `Lesson` schema: `id`, `title`, `description`, `steps: LessonStep[]`.

Each `LessonStep` has: `instruction` (markdown), `starterCode`, `expectedResult` (optional tuple set), `hints` (ordered array), `successMessage`.

---

## Privacy and Legal

- **First-visit modal:** shown once (localStorage flag). States: API keys are local-only, never sent to app servers; chat data is processed by the user's chosen third-party LLM provider per their own policy. Links to `/terms`.
- **Settings drawer callout:** reiterates key storage policy inline.
- **`/terms` page:** documents what is and isn't stored locally vs. sent to third-party providers, with links to each provider's privacy policy (Anthropic, OpenAI, Google, xAI, Groq).

---

## GitHub Issue Plan

### Milestone 1: Foundation (small issues)

**1.1 — Scaffold Next.js app**
Scaffold with `create-next-app`: TypeScript, Tailwind, App Router, ESLint. Add Prettier config and `@/` path alias. Output: a deployable empty shell with a placeholder homepage.

**1.2 — Configure Vercel deployment**
Add `vercel.json`, `.env.example` documenting all required env vars (`GROQ_API_KEY`, `NEXT_PUBLIC_APP_URL`, `COOKIE_SECRET`, `ANON_FALLBACK_TOKEN_CAP`). Add a minimal `README` explaining how to deploy and set env vars on Vercel.

**1.3 — Download and vendor Minigraf WASM**
Add `scripts/download-wasm.sh` that fetches `minigraf-browser-wasm.tar.gz` from the v0.21.1 GitHub release and unpacks to `public/wasm/`. Wire into `package.json` as a `postinstall` script. Add `public/wasm/` to `.gitignore`. Store the pinned version in `wasm.config.json`.

**1.4 — WASM loader hook**
Implement `hooks/useMinigraf.ts`: load the WASM module from `/public/wasm/`, initialize as a singleton, expose `query(datalog: string): Promise<QueryResult>`. Handle loading, ready, and error states.

**1.5 — IndexedDB persistence layer**
Implement `lib/storage.ts`: typed IndexedDB wrapper with stores for `graph_state`, `session_prefs`, `api_keys`, `lesson_progress`, `chat_history`. Expose typed CRUD functions for each store. API keys stored in their own store; code comments note they are never sent to app servers.

**1.6 — First-visit privacy + T&C modal**
Modal shown on first visit (localStorage flag). States: API keys are local-only; chat data goes to third-party LLM providers per their own policies. Links to `/terms` (placeholder page). "I understand" dismisses and sets flag.

---

### Milestone 2: Core UX (medium issues)

**2.1 — Build split-pane layout shell**
Main layout: left panel (2/3) with editor top and results bottom, right panel (1/3) for chat. Drag-handle resize. Top nav with logo, Lessons/Sandbox toggle, settings icon (placeholder). All panels are empty shells.

**2.2 — Integrate CodeMirror 6 editor**
CodeMirror 6 with Datalog syntax highlighting (keywords, variables `?x`, atoms). "▶ Run" button calls `useMinigraf`'s `query()` and emits result via callback prop. Parse errors displayed inline below editor.

**2.3 — Results table panel**
Render `QueryResult` as a sortable table (variable names as columns, tuples as rows). Show row count and query execution time. Empty state: "Run a query to see results." Error state: red-border treatment with WASM error message.

**2.4 — Graph visualization toggle**
"⬡ Graph" toggle button in results panel header. When active, render results as force-directed graph via React Flow (nodes = entity values, edges = relationship tuples). Toggle disabled with tooltip when result set has ≠ 2 columns.

**2.5 — Lessons / Sandbox mode switcher**
Mode toggle in nav bar. Sandbox: freeform editor, graph state persists to IndexedDB. Lessons: collapsible lesson sidebar on far left with 4 lesson titles and lock/progress icons (placeholder content). Preference persists to `session_prefs`.

---

### Milestone 3: AI Tutor (medium issues)

**3.1 — Provider selector + BYOK settings panel**
Settings drawer: provider dropdown (Gemini, Anthropic, OpenAI, xAI), model selector per provider, API key input (password type), "Test connection" button, "Clear key" button. Keys saved to IndexedDB on submit. Visible callout: "Your API key is stored only in this browser. It is never sent to our servers."

**3.2 — Anonymous fallback + server-side proxy route**
`app/api/chat/route.ts` (Vercel edge function). If user key present: proxy to chosen provider. Otherwise: Groq fallback with `GROQ_API_KEY`. Anon fallback enforces per-session token cap via signed cookie; returns `429` with user-facing message when exhausted. Response streamed.

**3.3 — Chat pane UI**
Scrollable message history (user + assistant bubbles), text input with send button, streaming token-by-token rendering, loading indicator for first token. When anon cap hit: inline banner "You've used your free quota — add your own API key for unlimited access" with link to settings drawer. Chat history persisted to IndexedDB `chat_history` (keyed by `lesson_id` or `"sandbox"`). "Clear chat" button in panel header.

**3.4 — Validate → Diff → Narrate loop**
Implement `lib/tutor.ts`:
- **Validate:** run user's query against WASM, capture structured diagnostics.
- **Diff:** if lesson step has expected result, compute symmetric difference (missing/unexpected tuples).
- **Narrate:** build LLM prompt from system prompt, query source, diagnostics or diff summary, conversation history. Send to proxy route. Never send raw full result sets.

**3.5 — System prompt + tutor persona**
Implement `lib/system-prompt.ts`: builds prompt dynamically. Stable prefix: Minigraf Datalog syntax reference, tutor persona, hints-not-solutions policy. Dynamic suffix: current lesson step goal and progress. Designed for prompt caching (stable prefix maximizes cache hits).

---

### Milestone 4: Lessons (medium issues)

**4.1 — Lesson schema and data format**
Define `lib/lessons/schema.ts`: TypeScript types for `Lesson` and `LessonStep` (`instruction`, `starterCode`, `expectedResult`, `hints`, `successMessage`). Write `lib/lessons/index.ts` exporting the ordered lesson list. All data is static TypeScript — no database.

**4.2 — Lesson runner**
Implement `hooks/useLesson.ts`: manages current lesson/step state, loads `starterCode` into editor on step entry, checks result against `expectedResult`, advances on success, persists progress to IndexedDB `lesson_progress`. Expose `currentStep`, `submitResult()`, `nextStep()`, `resetStep()`. Lesson sidebar (Issue 2.5) connects to this hook for progress indicators.

**4.3 — Lesson 1: Basic facts and queries**
Steps: (1) assert facts about people, (2) simple lookup query, (3) query with a variable, (4) open-ended — model a small dataset of your choice. Starter code and expected results for steps 1–3; step 4 is open-ended.

**4.4 — Lesson 2: Rules and inference**
Steps: (1) define a simple rule (`mortal(X) :- human(X).`), (2) query derived facts, (3) chain two rules, (4) open-ended — write a rule of your own. Starter code and expected results for steps 1–3.

**4.5 — Lesson 3: Recursive rules**
Steps: (1) base case + recursive rule (ancestor/reachable), (2) query transitive closure, (3) observe Datalog termination guarantees, (4) open-ended — model a hierarchy. Starter code and expected results for steps 1–3.

**4.6 — Lesson 4: Bi-temporal time travel**
Steps: (1) insert fact with valid-time range, (2) query as-of a past timestamp, (3) correct a historical fact and observe both versions, (4) query full temporal history of an entity, (5) open-ended — model an event recorded incorrectly and later corrected. Hints are more detailed; system prompt instructs extra patience for bi-temporal confusion.

---

### Milestone 5: Polish (small-medium issues)

**5.1 — Error states and loading skeletons**
Audit all async operations (WASM init, query execution, LLM streaming, IndexedDB reads) for loading, error, and empty states. WASM failure: prominent banner with reload button. Query errors: highlight offending line in CodeMirror. LLM errors: inline in chat pane with provider error message.

**5.2 — Responsive layout**
Below 768px: single-column tabbed view (Editor | Results | Chat). Lessons sidebar collapses to a step indicator strip at top. Graph viz degrades to table-only on very small screens. Test on Chrome/Firefox/Safari.

**5.3 — Share query via URL hash**
"Share" button in editor panel encodes current editor content as base64 URL hash (`#q=<base64>`), copies link to clipboard with toast. On page load, `#q=` hash pre-populates editor. Client-side only, no server involvement.

**5.4 — /terms static page**
Content: (1) what data is stored locally and never leaves the browser, (2) what data is sent to third-party LLM providers when AI features are used, (3) links to provider privacy policies (Anthropic, OpenAI, Google, xAI, Groq), (4) as-is warranty disclaimer. Plain, readable — no legalese.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (server) | Groq API key for anonymous fallback |
| `NEXT_PUBLIC_APP_URL` | Yes (client) | Public URL of the deployed app |
| `ANON_FALLBACK_TOKEN_CAP` | Optional | Per-session token cap for anon fallback (default: 10000) |
| `COOKIE_SECRET` | Yes (server) | Secret for signing the anon fallback session cookie |
