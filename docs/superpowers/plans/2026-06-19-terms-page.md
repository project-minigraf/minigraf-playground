# Terms Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/terms` page with full content covering local data storage, third-party LLM data flow, provider privacy policy links, and a warranty disclaimer.

**Architecture:** Single Next.js server component — no client-side JS, no state. Renders a styled static page with three content sections. A render test validates all acceptance criteria (required text, all 5 provider links).

**Tech Stack:** Next.js 15 App Router (server component), Tailwind CSS, @testing-library/react

---

### Task 1: Terms page content

**Files:**
- Modify: `app/terms/page.tsx`
- Test: `__tests__/components/TermsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/TermsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import TermsPage from '@/app/terms/page'

describe('TermsPage', () => {
  beforeEach(() => {
    render(<TermsPage />)
  })

  it('renders the page heading', () => {
    expect(screen.getByRole('heading', { name: /terms & conditions/i, level: 1 })).toBeInTheDocument()
  })

  it('shows the last updated date', () => {
    expect(screen.getByText(/june 2026/i)).toBeInTheDocument()
  })

  it('lists all 5 local data types', () => {
    expect(screen.getByText(/api keys/i)).toBeInTheDocument()
    expect(screen.getByText(/graph state/i)).toBeInTheDocument()
    expect(screen.getByText(/lesson progress/i)).toBeInTheDocument()
    expect(screen.getByText(/chat history/i)).toBeInTheDocument()
    expect(screen.getByText(/provider and model preferences/i)).toBeInTheDocument()
  })

  it('includes all 5 provider privacy policy links', () => {
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('https://www.anthropic.com/legal/privacy')
    expect(hrefs).toContain('https://openai.com/policies/privacy-policy')
    expect(hrefs).toContain('https://policies.google.com/privacy')
    expect(hrefs).toContain('https://x.ai/legal/privacy-policy')
    expect(hrefs).toContain('https://groq.com/privacy-policy/')
  })

  it('includes the warranty disclaimer', () => {
    expect(screen.getByText(/provided as-is, without warranty/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="TermsPage" --no-coverage
```

Expected: FAIL — tests referencing `graph state`, `lesson progress`, provider links, etc. fail because the current page only renders "Full terms coming soon."

- [ ] **Step 3: Implement the page**

Replace `app/terms/page.tsx` with:

```tsx
export const metadata = { title: 'Terms & Conditions — Minigraf Playground' }

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 px-6 text-gray-300 space-y-8">
      <h1 className="text-2xl font-bold text-white">Terms &amp; Conditions</h1>
      <p className="text-sm text-gray-500">Last updated: June 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What stays in your browser</h2>
        <p>The following is stored exclusively in your browser&apos;s IndexedDB and is never transmitted to our servers:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Your API keys for Anthropic, OpenAI, Google, xAI, and Groq</li>
          <li>Your graph state (Datalog facts and rules you have asserted)</li>
          <li>Your lesson progress</li>
          <li>Your chat history with the AI tutor</li>
          <li>Your provider and model preferences</li>
        </ul>
        <p className="text-sm">Clearing browser storage or using a different browser resets all of the above.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What gets sent to third parties</h2>
        <p className="text-sm">When you use the AI tutor, your queries, chat messages, and lesson context are sent to the LLM provider you have selected. If you have not provided your own API key, a Groq-based anonymous fallback is used.</p>
        <p className="text-sm">Each provider processes this data under their own privacy policy:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><a href="https://www.anthropic.com/legal/privacy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
          <li><a href="https://openai.com/policies/privacy-policy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a></li>
          <li><a href="https://policies.google.com/privacy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
          <li><a href="https://x.ai/legal/privacy-policy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">xAI Privacy Policy</a></li>
          <li><a href="https://groq.com/privacy-policy/" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Groq Privacy Policy</a></li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Disclaimer</h2>
        <p className="text-sm">Minigraf Playground is provided as-is, without warranty of any kind. It is an educational tool and is not intended for production use. Use at your own risk.</p>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="TermsPage" --no-coverage
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm test --no-coverage
```

Expected: All tests PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add app/terms/page.tsx __tests__/components/TermsPage.test.tsx
git commit -m "feat: add full terms and conditions page with provider privacy links"
```
