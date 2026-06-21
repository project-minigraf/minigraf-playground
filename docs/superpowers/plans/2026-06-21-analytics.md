# Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-first event analytics to minigraf-playground using a self-built `/api/event` route backed by Vercel KV, plus outbound links in the NavBar and Footer, and a private Next.js admin dashboard to visualize the data.

**Architecture:** A `trackEvent` utility fire-and-forgets POSTs to `/api/event`, which atomically increments daily-bucketed counters in Vercel KV (e.g. `events:lesson_completed:2026-06-21`). A private Next.js app on the same Vercel team reads those keys server-side and renders a summary table. No third-party scripts load in the browser; KV credentials are never exposed to the client.

**Tech Stack:** Next.js 15 (App Router), TypeScript, `@vercel/kv`, Tailwind CSS, Jest

---

## Spec

`docs/superpowers/specs/2026-06-21-analytics-design.md`

> **Before starting:** Verify the outbound URLs in the spec's Outbound Links table. Confirm the crate is published on crates.io, the GitHub wiki exists, and the docs.rs page is live before adding the links.

---

## File Map

### Public repo (`minigraf-playground`)

| Action | Path | Responsibility |
|---|---|---|
| Modify | `lib/types.ts` | Add `EventName` union type |
| Create | `lib/analytics.ts` | `trackEvent` fire-and-forget utility |
| Create | `app/api/event/route.ts` | Edge function — validates + increments KV counter |
| Create | `components/layout/Footer.tsx` | Footer bar with outbound links |
| Modify | `components/layout/NavBar.tsx` | Add GitHub icon link |
| Modify | `app/layout.tsx` | Add `<Footer />`, fix missing `<Analytics />` render |
| Modify | `components/layout/AppShell.tsx` | Add `lesson_started`, `lesson_completed`, `query_run` tracking |
| Modify | `components/chat/ChatPanel.tsx` | Add `tutor_message_sent` tracking |
| Create | `__tests__/lib/analytics.test.ts` | Unit tests for `trackEvent` |
| Create | `__tests__/app/api/event.test.ts` | Unit tests for the event route |

### Admin repo (`minigraf-playground-admin`)

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/kv.ts` | Read + group all `events:*` keys from KV |
| Create | `app/page.tsx` | Server component dashboard — renders event tables |
| Modify | `app/layout.tsx` | Minimal wrapper (strip create-next-app boilerplate) |

---

## Task 1: Add `EventName` type and `trackEvent` utility

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/analytics.ts`
- Create: `__tests__/lib/analytics.test.ts`

- [ ] **Step 1.1: Add `EventName` to `lib/types.ts`**

Append after the last existing type:

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

- [ ] **Step 1.2: Write the failing tests**

Create `__tests__/lib/analytics.test.ts`:

```ts
import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('POSTs the correct event name and a YYYY-MM-DD date to /api/event', () => {
    trackEvent('query_run')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/event')
    expect(init.method).toBe('POST')

    const body = JSON.parse(init.body as string) as { event: string; date: string }
    expect(body.event).toBe('query_run')
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not throw when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network error'))
    expect(() => trackEvent('lesson_started')).not.toThrow()
    // Let the rejected promise settle — no unhandled rejection
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
```

- [ ] **Step 1.3: Run tests — confirm they fail**

```bash
npm test -- --testPathPattern="analytics.test"
```

Expected: FAIL — `Cannot find module '@/lib/analytics'`

- [ ] **Step 1.4: Create `lib/analytics.ts`**

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

- [ ] **Step 1.5: Run tests — confirm they pass**

```bash
npm test -- --testPathPattern="analytics.test"
```

Expected: PASS — 2 tests

- [ ] **Step 1.6: Commit**

```bash
git add lib/types.ts lib/analytics.ts __tests__/lib/analytics.test.ts
git commit -m "feat: add EventName type and trackEvent utility"
```

---

## Task 2: `/api/event` Edge route

**Files:**
- Create: `app/api/event/route.ts`
- Create: `__tests__/app/api/event.test.ts`

- [ ] **Step 2.1: Write the failing tests**

Create `__tests__/app/api/event.test.ts`:

```ts
const mockIncr = jest.fn().mockResolvedValue(1)

jest.mock('@vercel/kv', () => ({
  kv: { incr: mockIncr },
}))

import { POST } from '@/app/api/event/route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/event', () => {
  beforeEach(() => {
    mockIncr.mockClear()
  })

  it('returns 204 and increments the correct KV key for a valid event', async () => {
    const res = await POST(makeRequest({ event: 'query_run', date: '2026-06-21' }))
    expect(res.status).toBe(204)
    expect(mockIncr).toHaveBeenCalledWith('events:query_run:2026-06-21')
  })

  it('returns 400 for an unknown event name', async () => {
    const res = await POST(makeRequest({ event: 'fake_event', date: '2026-06-21' }))
    expect(res.status).toBe(400)
    expect(mockIncr).not.toHaveBeenCalled()
  })

  it('returns 400 for a malformed date', async () => {
    const res = await POST(makeRequest({ event: 'query_run', date: 'today' }))
    expect(res.status).toBe(400)
    expect(mockIncr).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2.2: Run tests — confirm they fail**

```bash
npm test -- --testPathPattern="api/event"
```

Expected: FAIL — `Cannot find module '@/app/api/event/route'`

- [ ] **Step 2.3: Install `@vercel/kv`**

```bash
npm install @vercel/kv
```

- [ ] **Step 2.4: Create `app/api/event/route.ts`**

```ts
import { kv } from '@vercel/kv'
import type { EventName } from '@/lib/types'

export const runtime = 'edge'

const VALID_EVENTS = new Set<EventName>([
  'lesson_started',
  'lesson_completed',
  'query_run',
  'tutor_message_sent',
  'outbound_click_github',
  'outbound_click_crates',
  'outbound_click_wiki',
  'outbound_click_docs_rs',
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

- [ ] **Step 2.5: Run tests — confirm they pass**

```bash
npm test -- --testPathPattern="api/event"
```

Expected: PASS — 3 tests

- [ ] **Step 2.6: Run full test suite — confirm nothing broke**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 2.7: Commit**

```bash
git add app/api/event/route.ts __tests__/app/api/event.test.ts package.json package-lock.json
git commit -m "feat: add /api/event edge route with Vercel KV"
```

---

## Task 3: Footer component + fix layout

**Files:**
- Create: `components/layout/Footer.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 3.1: Create `components/layout/Footer.tsx`**

> Before coding: verify the URLs below are live. Check `https://github.com/project-minigraf/minigraf`, `https://crates.io/crates/minigraf`, `https://github.com/project-minigraf/minigraf/wiki`, and `https://docs.rs/minigraf` in a browser. Update any that are wrong.

```tsx
'use client'
import { trackEvent } from '@/lib/analytics'
import type { EventName } from '@/lib/types'

const OUTBOUND_LINKS: { label: string; href: string; event: EventName }[] = [
  { label: 'GitHub', href: 'https://github.com/project-minigraf/minigraf', event: 'outbound_click_github' },
  { label: 'crates.io', href: 'https://crates.io/crates/minigraf', event: 'outbound_click_crates' },
  { label: 'Wiki', href: 'https://github.com/project-minigraf/minigraf/wiki', event: 'outbound_click_wiki' },
  { label: 'docs.rs', href: 'https://docs.rs/minigraf', event: 'outbound_click_docs_rs' },
]

export function Footer() {
  return (
    <footer className="h-8 flex items-center justify-center gap-5 border-t border-gray-800 bg-gray-950 text-xs text-gray-500 shrink-0">
      {OUTBOUND_LINKS.map(({ label, href, event }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(event)}
          className="hover:text-gray-300 transition-colors"
        >
          {label}
        </a>
      ))}
      <a href="/terms" className="hover:text-gray-300 transition-colors">
        Terms
      </a>
    </footer>
  )
}
```

- [ ] **Step 3.2: Update `app/layout.tsx`**

Add `<Footer />` and fix the missing `<Analytics />` render. The full file should be:

```tsx
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PrivacyModal } from "@/components/modals/PrivacyModal";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Minigraf Playground",
  description:
    "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
  openGraph: {
    title: "Minigraf Playground",
    description:
      "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
    url: appUrl,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minigraf Playground",
    description:
      "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Footer />
        <PrivacyModal />
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 3.3: Confirm build passes**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3.4: Commit**

```bash
git add components/layout/Footer.tsx app/layout.tsx
git commit -m "feat: add Footer with outbound links and fix Analytics render"
```

---

## Task 4: GitHub icon in NavBar

**Files:**
- Modify: `components/layout/NavBar.tsx`

- [ ] **Step 4.1: Update `components/layout/NavBar.tsx`**

Add the GitHub icon link left of the Settings button. Full file:

```tsx
'use client'
import { Github, Settings } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

type Mode = 'sandbox' | 'lessons'

interface NavBarProps {
  mode: Mode
  onModeChange: (m: Mode) => void
  onSettingsOpen: () => void
}

export function NavBar({ mode, onModeChange, onSettingsOpen }: NavBarProps) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b shrink-0 border-gray-800 bg-gray-950">
      <span className="font-bold tracking-tight text-white">Minigraf Playground</span>
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border text-sm border-gray-700">
          {(['sandbox', 'lessons'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1 capitalize transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <a
          href="https://github.com/project-minigraf/minigraf"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('outbound_click_github')}
          className="transition-colors text-gray-400 hover:text-white"
          aria-label="GitHub repository"
        >
          <Github size={18} />
        </a>
        <button onClick={onSettingsOpen} className="transition-colors text-gray-400 hover:text-white">
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4.2: Commit**

```bash
git add components/layout/NavBar.tsx
git commit -m "feat: add GitHub icon link to NavBar"
```

---

## Task 5: AppShell event tracking

**Files:**
- Modify: `components/layout/AppShell.tsx`

Three events to add: `lesson_started`, `query_run`, and `lesson_completed`.

- [ ] **Step 5.1: Add `trackEvent` import to `AppShell.tsx`**

Add to the import block at the top (after existing imports):

```ts
import { trackEvent } from '@/lib/analytics'
```

- [ ] **Step 5.2: Add `lesson_started` in `handleActiveLessonChange`**

Find `handleActiveLessonChange` (around line 135) and add `trackEvent('lesson_started')` as the first line of the callback body:

```ts
const handleActiveLessonChange = useCallback(async (id: string) => {
  trackEvent('lesson_started')
  tutorialManager.setActiveLessonId(id)
  // ... rest unchanged
```

- [ ] **Step 5.3: Add `query_run` in `handleResult`**

Find `handleResult` (around line 183) and add `trackEvent('query_run')` after `setQueryError(null)`:

```ts
const handleResult = useCallback(async (result: QueryResult, queryCode?: string) => {
  setQueryResult(result)
  setQueryError(null)
  trackEvent('query_run')
  // ... rest unchanged
```

- [ ] **Step 5.4: Add `lesson_completed` tracking**

Add a ref declaration near the other refs at the top of `AppShell` (after `const hashAppliedRef = useRef(false)`):

```ts
const lessonCompletedFiredRef = useRef<string | null>(null)
```

Then add this new `useEffect` after the existing effect at line ~175 that updates `completedStepsPerLesson`:

```ts
useEffect(() => {
  if (
    mode === 'lessons' &&
    activeLessonId &&
    lessonRunner.totalSteps > 0 &&
    lessonRunner.completedSteps.length === lessonRunner.totalSteps &&
    lessonCompletedFiredRef.current !== activeLessonId
  ) {
    lessonCompletedFiredRef.current = activeLessonId
    trackEvent('lesson_completed')
  }
}, [mode, activeLessonId, lessonRunner.completedSteps.length, lessonRunner.totalSteps])
```

- [ ] **Step 5.5: Run build — confirm no TypeScript errors**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 5.6: Commit**

```bash
git add components/layout/AppShell.tsx
git commit -m "feat: track lesson_started, lesson_completed, and query_run events"
```

---

## Task 6: ChatPanel `tutor_message_sent` tracking

**Files:**
- Modify: `components/chat/ChatPanel.tsx`

- [ ] **Step 6.1: Add `trackEvent` import to `ChatPanel.tsx`**

Add to the import block (after existing imports at the top of the file):

```ts
import { trackEvent } from '@/lib/analytics'
```

- [ ] **Step 6.2: Add tracking in `handleSubmit`**

Find `handleSubmit` (around line 366). Add `trackEvent('tutor_message_sent')` immediately after the early-return guard:

```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  const rawInput = input.trim()
  if (!rawInput || loading) return

  trackEvent('tutor_message_sent')

  const userInput = formatInput(rawInput)
  // ... rest unchanged
```

- [ ] **Step 6.3: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6.4: Commit**

```bash
git add components/chat/ChatPanel.tsx
git commit -m "feat: track tutor_message_sent event"
```

---

## Task 7: Scaffold admin app

Work in the admin repo from here on: `../minigraf-playground-admin`

- [ ] **Step 7.1: Scaffold Next.js app**

```bash
cd ../minigraf-playground-admin
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

When prompted, accept all defaults.

- [ ] **Step 7.2: Install `@vercel/kv`**

```bash
npm install @vercel/kv
```

- [ ] **Step 7.3: Strip the default layout boilerplate**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Minigraf Analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 7.4: Delete the default page content**

Delete `app/page.tsx` — it will be replaced in Task 8.

- [ ] **Step 7.5: Confirm build passes on the scaffold**

Next.js requires a root page. Create a temporary placeholder, build, then delete it (it will be replaced in Task 8):

```bash
echo "export default function Page() { return <p>loading</p> }" > app/page.tsx
npm run build
```

Expected: build passes

- [ ] **Step 7.6: Initial commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js admin app"
```

---

## Task 8: KV helper and dashboard page

**Files:**
- Create: `lib/kv.ts`
- Modify: `app/page.tsx`

- [ ] **Step 8.1: Create `lib/kv.ts`**

```ts
import { kv } from '@vercel/kv'

/**
 * Returns all event counts grouped by event name and date.
 * Shape: { 'lesson_completed': { '2026-06-21': 42, '2026-06-20': 31 }, ... }
 */
export async function getAllEventCounts(): Promise<Record<string, Record<string, number>>> {
  const keys = await kv.keys('events:*')
  if (keys.length === 0) return {}

  const values = await kv.mget<number>(...keys) // (number | null)[]

  const result: Record<string, Record<string, number>> = {}
  keys.forEach((key, i) => {
    // key format: events:{event_name}:{YYYY-MM-DD}
    const parts = key.split(':')
    const date = parts[parts.length - 1]
    const eventName = parts.slice(1, -1).join(':')
    if (!result[eventName]) result[eventName] = {}
    result[eventName][date] = values[i] ?? 0
  })

  return result
}
```

- [ ] **Step 8.2: Replace `app/page.tsx` with the dashboard**

```tsx
import { getAllEventCounts } from '@/lib/kv'

export const revalidate = 0

export default async function AdminPage() {
  const counts = await getAllEventCounts()
  const eventNames = Object.keys(counts).sort()

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">Minigraf Analytics</h1>

      {eventNames.length === 0 && (
        <p className="text-gray-500">No events recorded yet.</p>
      )}

      {eventNames.map((eventName) => {
        const daily = counts[eventName]
        const dates = Object.keys(daily).sort().reverse()
        const total = Object.values(daily).reduce((a, b) => a + b, 0)

        return (
          <section key={eventName} className="mb-10">
            <h2 className="text-lg font-semibold mb-3 text-blue-400">{eventName}</h2>
            <table className="w-full max-w-xs text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-2 pr-8 font-medium">Date</th>
                  <th className="pb-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr key={date} className="border-b border-gray-800">
                    <td className="py-1.5 pr-8 text-gray-300">{date}</td>
                    <td className="py-1.5">{daily[date]}</td>
                  </tr>
                ))}
                <tr className="text-gray-400 font-medium">
                  <td className="pt-2 pr-8">Total</td>
                  <td className="pt-2">{total}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )
      })}
    </main>
  )
}
```

- [ ] **Step 8.3: Confirm build passes**

```bash
npm run build
```

Expected: no errors

Note: the build will succeed even without KV env vars present locally — `kv.keys` is only called at request time, not build time.

- [ ] **Step 8.4: Commit**

```bash
git add lib/kv.ts app/page.tsx
git commit -m "feat: add KV helper and analytics dashboard page"
```

---

## Task 9: Connect Vercel KV and deploy

This task involves the Vercel dashboard — it cannot be automated.

- [ ] **Step 9.1: Create a Vercel KV store (if not already created)**

In the Vercel dashboard: Storage → Create Database → KV → give it a name (e.g. `minigraf-kv`). Connect it to the `minigraf-playground` project. Vercel will inject `VERCEL_KV_*` env vars automatically.

- [ ] **Step 9.2: Connect the same KV store to the admin project**

In the `minigraf-playground-admin` Vercel project: Settings → Environment Variables → Connect KV Store → select `minigraf-kv`. This shares the same store without copying secrets manually.

- [ ] **Step 9.3: Push both repos**

```bash
# Public repo
cd ../minigraf-playground
git push

# Admin repo
cd ../minigraf-playground-admin
git push
```

- [ ] **Step 9.4: Verify end-to-end**

1. Open the deployed playground. Switch to Lessons mode, click a lesson — `lesson_started` should fire.
2. Run a query — `query_run` should fire.
3. Send a message in the chat panel — `tutor_message_sent` should fire.
4. Click the GitHub link in the NavBar and Footer — `outbound_click_github` should fire.
5. Open the admin dashboard URL. Confirm the event counts appear.

---

## Definition of Done

- [ ] `npm test` passes in the public repo (all existing + new tests green)
- [ ] `npm run build` passes in both repos
- [ ] All five event types fire correctly in the browser (verified manually per Task 9.4)
- [ ] Admin dashboard shows counts after events are fired
- [ ] No unrelated files changed
