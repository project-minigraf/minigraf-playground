# Analytics Design

**Date:** 2026-06-21
**Scope:** Privacy-first event analytics for minigraf-playground + private admin dashboard

---

## Background

The playground already includes `@vercel/analytics` (imported in `app/layout.tsx` but not yet rendered). That covers pageviews and referrers. This design adds funnel analytics — lesson completions, query runs, tutor usage, and outbound link conversions — using a self-built event counter backed by Vercel KV.

**Why not Google Analytics or Plausible:** GA is inconsistent with the project's local-first privacy positioning. Plausible loads a third-party script and costs $9/mo. The self-built approach keeps the privacy claim literally true (no third-party scripts, no external network requests from the browser except to the app's own `/api/event` route), costs nothing beyond the KV free tier, and gives full control over the dashboard.

---

## Architecture

```
minigraf-playground (public)          minigraf-playground-admin (private)
─────────────────────────────         ─────────────────────────────────────
lib/analytics.ts                      app/page.tsx
  trackEvent(name)                      Server component
  └── POST /api/event                   reads all events:* keys from KV
                                        renders summary table
app/api/event/route.ts
  Edge function                       lib/kv.ts
  └── INCR events:{name}:{date}         typed KV query helpers
      in Vercel KV
                                      Both apps share the same Vercel KV
components/layout/NavBar.tsx          instance via VERCEL_KV_* env vars
  + GitHub icon link                  linked in the Vercel dashboard

components/layout/Footer.tsx (new)
  GitHub · crates.io · Wiki · docs.rs · Terms

app/layout.tsx
  + <Footer />
  + <Analytics /> (fix missing render)
```

**Data flow:**
1. Browser fires `trackEvent('lesson_completed')`
2. `lib/analytics.ts` POSTs `{ event, date }` to `/api/event` — fire-and-forget
3. Edge function atomically increments `events:lesson_completed:2026-06-21` in KV
4. Admin app reads all `events:*` keys server-side and renders a table

No event data returns to the client. KV credentials are never exposed to the browser.

---

## Data Model

**KV key schema:**
```
events:{event_name}:{YYYY-MM-DD}  →  integer counter
```

**Event names:**

| Event | KV key suffix | Fired when |
|---|---|---|
| `lesson_started` | `lesson_started` | User clicks a lesson in the sidebar |
| `lesson_completed` | `lesson_completed` | All steps in a lesson are completed |
| `query_run` | `query_run` | A query executes successfully |
| `tutor_message_sent` | `tutor_message_sent` | User submits a message in the chat panel |
| `outbound_click_github` | `outbound_click_github` | GitHub repo link clicked |
| `outbound_click_crates` | `outbound_click_crates` | crates.io link clicked |
| `outbound_click_wiki` | `outbound_click_wiki` | Wiki link clicked |
| `outbound_click_docs_rs` | `outbound_click_docs_rs` | docs.rs link clicked |

**`EventName` type** (added to `lib/types.ts`):
```ts
export type EventName =
  | 'lesson_started'
  | 'lesson_completed'
  | 'query_run'
  | 'tutor_message_sent'
  | 'outbound_click_github'
  | 'outbound_click_crates'
  | 'outbound_click_wiki'
  | 'outbound_click_docs_rs'
```

**Date:** `YYYY-MM-DD` in UTC, computed client-side. Acceptable for aggregate counts on a tutorial app — not billing-critical data.

Each destination gets its own key rather than a shared `outbound_click` key with a `destination` property, so the admin app can read and display them as plain integer counters without any parsing.

---

## Public Repo Changes

### New files

**`lib/analytics.ts`**
```ts
import type { EventName } from './types'

export function trackEvent(event: EventName): void {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  fetch('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, date }),
  }).catch(() => {}) // fire-and-forget, never throws
}
```

**`app/api/event/route.ts`**
```ts
import { kv } from '@vercel/kv'
import type { EventName } from '@/lib/types'

export const runtime = 'edge'

const VALID_EVENTS = new Set<EventName>([
  'lesson_started', 'lesson_completed', 'query_run', 'tutor_message_sent',
  'outbound_click_github', 'outbound_click_crates',
  'outbound_click_wiki', 'outbound_click_docs_rs',
])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: Request) {
  const body = await req.json() as { event: string; date: string }
  if (!VALID_EVENTS.has(body.event as EventName) || !DATE_RE.test(body.date)) {
    return new Response(null, { status: 400 })
  }
  await kv.incr(`events:${body.event}:${body.date}`)
  return new Response(null, { status: 204 })
}
```

**`components/layout/Footer.tsx`**
- Thin bar matching NavBar's `border-gray-800 bg-gray-950` style
- Links: GitHub · crates.io · Wiki · docs.rs (outbound, each fires its `trackEvent`) · Terms (internal `/terms`, no tracking)
- All outbound links: `target="_blank" rel="noopener noreferrer"`

### Modified files

**`lib/types.ts`** — add `EventName` type (see Data Model above)

**`components/layout/NavBar.tsx`**
- Import `Github` from `lucide-react` (already a project dependency)
- Add `<a>` with GitHub repo URL, placed left of the Settings icon
- `onClick={() => trackEvent('outbound_click_github')}`
- `target="_blank" rel="noopener noreferrer"`

**`app/layout.tsx`**
- Add `<Footer />` inside the body
- Add `<Analytics />` to the JSX (imported but never rendered — existing bug)

**`components/layout/AppShell.tsx`** — three call sites:

| Event | Location | Notes |
|---|---|---|
| `lesson_started` | `handleActiveLessonChange` | Fires when user selects a lesson |
| `lesson_completed` | `useEffect` watching `lessonRunner.completedSteps` | Fires when `completedSteps.length === totalSteps && totalSteps > 0`. Guarded by a `useRef<string \| null>` tracking the last lesson ID for which the event fired — resets on `activeLessonId` change to prevent duplicate fires |
| `query_run` | `handleResult` | Fires on every successful query execution |

**`components/chat/ChatPanel.tsx`**
- Import `trackEvent` directly
- Call `trackEvent('tutor_message_sent')` where user message is submitted
- No prop drilling — utility import is sufficient

### New dependency

`@vercel/kv` — Vercel's official KV client. Required in the public repo for the `/api/event` route.

---

## Outbound Links

| Link | NavBar | Footer | URL |
|---|---|---|---|
| GitHub repo | ✓ (icon) | ✓ (text) | `https://github.com/project-minigraf/minigraf` |
| crates.io | — | ✓ | `https://crates.io/crates/minigraf` |
| Wiki | — | ✓ | `https://github.com/project-minigraf/minigraf/wiki` |
| docs.rs | — | ✓ | `https://docs.rs/minigraf` |
| Terms | — | ✓ (internal) | `/terms` |

> **Note for implementer:** Verify all external URLs before adding them. The URLs above are inferred from the GitHub org name (`project-minigraf`) and crate name (`minigraf`) — confirm the crate is published and the wiki exists before linking.

---

## Admin App (Private Repo)

**Repo:** `minigraf-playground-admin` (private, same Vercel team)

**Stack:** Next.js 15, TypeScript, Tailwind, App Router. No `src/` directory.

**Additional dependency:** `@vercel/kv` only.

**File structure:**
```
minigraf-playground-admin/
  app/
    page.tsx      ← server component, reads KV, renders table
    layout.tsx    ← minimal wrapper
  lib/
    kv.ts         ← typed KV query helpers
```

**`lib/kv.ts`**
- Exports `getAllEventCounts(): Promise<Record<string, Record<string, number>>>`
- Uses `kv.keys('events:*')` to enumerate all keys
- Uses `kv.mget(...)` to fetch all counts in one round trip
- Returns structure: `{ 'lesson_completed': { '2026-06-21': 42, ... }, ... }`

**`app/page.tsx`**
- Server component — reads KV at request time (no caching)
- One section per event type, heading = event name
- Table per section: `date | count` rows, sorted newest-first, totals row at bottom
- Plain Tailwind, no charting library

**KV sharing:** Admin project linked to the same KV store in the Vercel dashboard. Vercel copies `VERCEL_KV_URL`, `VERCEL_KV_REST_API_URL`, and `VERCEL_KV_REST_API_TOKEN` automatically — no manual secret copying.

**Auth:** None. Deployed to an obscure Vercel preview URL, not linked publicly. The data is aggregate counts with no PII.

---

## Error Handling

- `trackEvent` swallows all errors silently. Analytics must never break the app.
- `/api/event` returns 400 for unknown event names or malformed dates, 500 if KV write fails. The client ignores both responses.
- `lesson_completed` useEffect is guarded by a ref to prevent duplicate events if the effect re-runs without the lesson changing.

---

## Testing (Public Repo)

Follows AGENTS.md rules: failing test first, tests in `__tests__/` mirroring source paths.

**`__tests__/lib/analytics.test.ts`**
- Mocks `fetch`
- Confirms correct POST body (`event`, `date`) for a known EventName
- Confirms fetch errors are swallowed (no throw, no unhandled rejection)

**`__tests__/app/api/event.test.ts`**
- Mocks `@vercel/kv`
- Confirms `kv.incr` is called with `events:{event}:{date}` for valid input
- Confirms 204 response on valid input
- Confirms 400 on unknown event name
- Confirms 400 on malformed date

No tests for the admin app — private utility with no business logic beyond a KV read and table render.

---

## Definition of Done

- [ ] `npm test` passes in the public repo
- [ ] `npm run build` passes in both repos
- [ ] Five events fire correctly verified manually in the browser
- [ ] Admin app shows counts after events are fired
- [ ] No unrelated files changed
