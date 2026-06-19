# Design: Share Query via URL Hash

**Date:** 2026-06-19  
**Issue:** [#25 — 5.3 Share query via URL hash](https://github.com/project-minigraf/minigraf-playground/issues/25)  
**Milestone:** 5 — Polish

---

## Goal

Add a Share button to the query editor that encodes the current editor content as a base64 URL hash, copies the resulting URL to the clipboard, and pre-populates the editor when that URL is opened.

---

## Architecture

### `lib/share.ts` (new)

Two pure, side-effect-free functions:

- `encodeQuery(query: string): string` — `btoa(encodeURIComponent(query))`
- `decodeQuery(encoded: string): string | null` — `decodeURIComponent(atob(encoded))`, returns `null` on any error

No browser globals needed; safe to import from anywhere.

### `__tests__/lib/share.test.ts` (new)

- Round-trip test: `decodeQuery(encodeQuery(s)) === s` for a representative multiline query
- Invalid input test: `decodeQuery('!!!invalid') === null`

Tests are written first (TDD).

### `components/editor/QueryEditor.tsx` (modified)

Add a Share button in the toolbar row next to Run:

- Local `copied: boolean` state, resets after 2 seconds via `setTimeout`
- On click: builds `${window.location.origin}${window.location.pathname}#q=${encodeQuery(value)}` and calls `navigator.clipboard.writeText`
- Label toggles between "Share" and "✓ Copied"
- Styled as a secondary/ghost button (smaller, muted) to not compete with Run

No new props required — `value` is already available in scope.

### `components/layout/AppShell.tsx` (modified)

Add a single `useEffect` with an empty dependency array (runs once on mount, before any other effects have had a chance to overwrite editor state):

1. Read `window.location.hash`
2. If it starts with `#q=`, call `decodeQuery(hash.slice(3))`
3. If decoding succeeds:
   - `setEditorValue(decoded)` — pre-populate the editor
   - `setMode('sandbox')` — force sandbox mode; avoids lesson runner overwriting the editor
   - `history.replaceState(null, '', window.location.pathname)` — clean the URL so session-prefs restoration on subsequent visits is unaffected
4. If hash is absent or decoding fails, do nothing

**Why `history.replaceState`:** The session prefs `useEffect` also calls `setMode`. If it ran after the hash effect it would re-override the forced sandbox. Clearing the hash immediately after applying it is the simplest way to avoid a flag/ref and keeps subsequent page loads clean.

---

## Data Flow

```
Share click → encodeQuery(value) → URL → clipboard
Open URL → decodeQuery(hash) → setEditorValue + setMode('sandbox') + clean URL
```

No server involvement at any point.

---

## Error Handling

- `decodeQuery` catches all exceptions and returns `null` — corrupted or truncated hashes are silently ignored, leaving the editor at its default state
- `navigator.clipboard.writeText` failure is not handled (not critical; UX degrades gracefully — button shows "Share" again)

---

## Acceptance Criteria

- [ ] Tests pass (`npm test`)
- [ ] Share button copies URL with `#q=` hash to clipboard
- [ ] Opening the URL pre-populates the editor and forces sandbox mode
- [ ] No server involvement
- [ ] URL is cleaned after hash is applied (no stale hash on refresh)
