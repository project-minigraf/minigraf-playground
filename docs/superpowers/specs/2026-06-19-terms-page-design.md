# Design: /terms Static Page (Issue #26)

**Date:** 2026-06-19
**Milestone:** 5 — Polish
**File:** `app/terms/page.tsx`

## Goal

Replace the placeholder `/terms` page with full legal/privacy content: what stays local, what goes to third-party LLMs, provider privacy policy links, and a warranty disclaimer.

## Prerequisite

Task 1.6 is complete — placeholder page exists at `app/terms/page.tsx`.

## Design

Single server component, no state, no client-side JS required.

### Metadata

```ts
export const metadata = { title: 'Terms & Conditions — Minigraf Playground' }
```

### Sections

1. **What stays in your browser**
   - Stored exclusively in IndexedDB, never transmitted to the app server
   - Lists: API keys (Anthropic, OpenAI, Google, xAI, Groq), graph state, lesson progress, chat history, provider/model preferences
   - Note: clearing browser storage resets all of the above

2. **What gets sent to third parties**
   - AI tutor queries, chat messages, and lesson context go to the selected LLM provider
   - Anonymous fallback uses Groq
   - Provider privacy policy links (all open in new tab with `rel="noopener noreferrer"`):
     - Anthropic: https://www.anthropic.com/legal/privacy
     - OpenAI: https://openai.com/policies/privacy-policy
     - Google: https://policies.google.com/privacy
     - xAI: https://x.ai/legal/privacy-policy
     - Groq: https://groq.com/privacy-policy/

3. **Disclaimer**
   - Provided as-is, without warranty
   - Educational tool, not intended for production use

### Styling

Consistent with existing dark-theme layout: `max-w-2xl mx-auto`, `text-gray-300`, white headings, `text-blue-400 underline` for links.

**Last updated:** June 2026

## Acceptance Criteria

- Page renders at `/terms` without error
- All 5 provider privacy policy links present and correct
- "What stays in your browser" lists all 5 data types
- Warranty disclaimer present
- `metadata.title` set correctly

## Commit

```
feat: add full terms and conditions page with provider privacy links
```
