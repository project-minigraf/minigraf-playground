# README & SEO Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the boilerplate README and `<title>` with real project content, add full OG/Twitter metadata, and fix stale `adityamukho/minigraf` URLs throughout the codebase.

**Architecture:** Two independent concerns — (1) stale ref cleanup in docs, (2) user-facing content: README rewrite + `layout.tsx` metadata update + a new `app/opengraph-image.tsx` that Next.js serves automatically at `GET /opengraph-image`.

**Tech Stack:** Next.js 15 App Router, `next/og` (`ImageResponse`), `Metadata` type from `next`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `AGENTS.md` | Modify | Fix stale GitHub URL (line 9) |
| `docs/superpowers/specs/2026-04-20-minigraf-playground-design.md` | Modify | Fix stale GitHub URL (line 10) |
| `docs/superpowers/plans/2026-04-20-minigraf-playground.md` | Modify | Fix stale GitHub URL in JSON snippet (line 267) |
| `README.md` | Rewrite | User-facing project page |
| `app/layout.tsx` | Modify | Replace boilerplate `metadata` export with real title, description, OG, Twitter tags |
| `app/opengraph-image.tsx` | Create | Dynamic 1200×630 OG image via `ImageResponse` |

---

### Task 1: Fix stale `adityamukho/minigraf` refs

**Files:**
- Modify: `AGENTS.md:9`
- Modify: `docs/superpowers/specs/2026-04-20-minigraf-playground-design.md:10`
- Modify: `docs/superpowers/plans/2026-04-20-minigraf-playground.md:267`

- [ ] **Step 1: Update `AGENTS.md`**

Replace line 9 — change `adityamukho/minigraf` to `project-minigraf/minigraf`:

```markdown
Minigraf Playground is a browser-based interactive tutorial for [Minigraf](https://github.com/project-minigraf/minigraf) — a tiny embedded graph database with Datalog querying and bi-temporal time travel. It runs Minigraf's WASM module in the browser, with an AI tutor powered by the user's own LLM API key (BYOK) or a Groq-based anonymous fallback.
```

- [ ] **Step 2: Update design spec**

In `docs/superpowers/specs/2026-04-20-minigraf-playground-design.md` line 10, change `adityamukho/minigraf` to `project-minigraf/minigraf`:

```markdown
A web-based interactive tutorial and sandbox for [Minigraf](https://github.com/project-minigraf/minigraf) — a tiny embedded graph database with Datalog querying and bi-temporal time travel. The playground runs entirely in the browser using Minigraf's pre-built WASM module, with an AI tutor powered by the user's own LLM API key (BYOK) or an anonymous free-tier fallback.
```

- [ ] **Step 3: Update implementation plan**

In `docs/superpowers/plans/2026-04-20-minigraf-playground.md` line 267, change the `url` field:

```json
  "url": "https://github.com/project-minigraf/minigraf/releases/download/v0.21.1/minigraf-browser-wasm.tar.gz",
```

- [ ] **Step 4: Verify no remaining stale refs**

Run:
```bash
grep -r "adityamukho/minigraf" . --include="*.md" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.sh" | grep -v ".worktrees/" | grep -v ".git/"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md docs/superpowers/specs/2026-04-20-minigraf-playground-design.md docs/superpowers/plans/2026-04-20-minigraf-playground.md
git commit -m "chore: fix stale adityamukho/minigraf refs"
```

---

### Task 2: Rewrite README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README content**

Overwrite `README.md` with:

```markdown
# Minigraf Playground

An interactive, browser-based tutorial for [Minigraf](https://github.com/project-minigraf/minigraf) —
a tiny embedded graph database with Datalog querying and bi-temporal time travel.

**[Open the Playground →](https://minigraf-playground.vercel.app)**

## What's inside

Five tutorials, each building toward progressively more advanced Datalog:

- **Basic Datalog** — facts, rules, and simple graph queries
- **Marketplace** — multi-hop paths and recursive reachability
- **Org Chart** — hierarchies, recursive ancestry, and negation
- **Sports League** — bi-temporal contracts, transfer chains, and aggregates
- **City Transit** — timetable queries, reachability under constraints, and negation

Plus a **Sandbox** mode — write your own facts and rules against a persistent local graph,
with the AI tutor available as you explore.

Each tutorial has an AI tutor (powered by your own API key or a free Groq fallback)
that can answer questions and explain your results.

## Privacy

Your API key never leaves your browser. All graph state and conversation history
are stored locally in IndexedDB. Nothing is sent to this app's servers.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for users"
```

---

### Task 3: Update `app/layout.tsx` metadata

**Files:**
- Modify: `app/layout.tsx`

The current `metadata` export (lines 17–20) is:

```ts
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

- [ ] **Step 1: Replace the `metadata` export**

Replace the block above with:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: "Minigraf Playground",
  description:
    "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
  openGraph: {
    title: "Minigraf Playground",
    description:
      "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
    url: process.env.NEXT_PUBLIC_APP_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minigraf Playground",
    description:
      "Interactive browser-based tutorials for Minigraf, a graph database with Datalog and bi-temporal time travel",
  },
};
```

The `metadataBase` makes all relative OG image URLs (including the auto-generated `/opengraph-image`) resolve to the correct absolute URL. `process.env.NEXT_PUBLIC_APP_URL` is already defined in `.env` as `https://minigraf-playground.vercel.app/`.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. The `metadata` type accepts `metadataBase: URL`, `openGraph.url: string | undefined`, and `twitter.card: 'summary_large_image'` — all valid.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add proper SEO metadata to layout"
```

---

### Task 4: Create dynamic OG image

**Files:**
- Create: `app/opengraph-image.tsx`

Next.js App Router automatically serves `app/opengraph-image.tsx` at `GET /opengraph-image` and wires it into the page's `<head>` OG image tag. No manual registration needed.

- [ ] **Step 1: Create `app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Minigraf Playground'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Minigraf Playground
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#a1a1aa',
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            Interactive browser-based tutorials for Minigraf, a graph database
            with Datalog and bi-temporal time travel
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: 24,
            color: '#52525b',
          }}
        >
          minigraf-playground.vercel.app
        </div>
      </div>
    ),
    { ...size }
  )
}
```

Notes:
- No external fonts — system font stack is used by default in `ImageResponse`, which avoids cold-start latency from fetching font files.
- `runtime = 'edge'` keeps it fast and consistent with `app/api/chat/route.ts`.
- All layout uses `display: 'flex'` — `ImageResponse` uses a Satori-based renderer that supports a Flexbox subset only; CSS Grid and most other layout properties are not supported.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build succeeds. Next.js will log a route entry for `/opengraph-image`.

- [ ] **Step 3: Verify OG image renders in dev**

```bash
npm run dev
```

Open `http://localhost:3000/opengraph-image` in a browser. Expected: a 1200×630 dark card with "Minigraf Playground" headline, the description subtitle, and the URL footer.

- [ ] **Step 4: Commit**

```bash
git add app/opengraph-image.tsx
git commit -m "feat: add dynamic OG image"
```
