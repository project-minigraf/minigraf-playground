# Theme Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add theme toggle button to NavBar that switches between light/dark mode

**Architecture:** Theme state in localStorage, CSS variables control colors, toggle applies `dark` class to document root

**Tech Stack:** React, localStorage, CSS custom properties, Lucide icons

---

### Task 1: Add theme state and toggle logic to NavBar

**Files:**
- Modify: `components/layout/NavBar.tsx`

- [ ] **Step 1: Add theme toggle button with icon**

Update the imports and add the toggle button to the NavBar:

```tsx
'use client'
import { Settings, Sun, Moon } from 'lucide-react'

type Mode = 'sandbox' | 'lessons'

interface NavBarProps {
  mode: Mode
  onModeChange: (m: Mode) => void
  onSettingsOpen: () => void
}

export function NavBar({ mode, onModeChange, onSettingsOpen }: NavBarProps) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-950 shrink-0">
      <span className="font-bold text-white tracking-tight">Minigraf Playground</span>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm">
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
        <button onClick={onSettingsOpen} className="text-gray-400 hover:text-white transition-colors">
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/NavBar.tsx
git commit -m "feat: add theme switcher to NavBar"
```

---

### Task 2: Test in browser

**Files:**
- None (manual testing)

- [ ] **Step 1: Run dev server and verify**

Run: `npm run dev`
Expected: App starts, theme toggle button visible, clicking toggles light/dark mode

- [ ] **Step 2: Verify persistence**

Refresh page, verify theme choice persists

---

## Spec Coverage

- ✅ Theme toggle button in NavBar (Task 1)
- ✅ To the left of mode switcher (Task 1)
- ✅ Light/dark modes (Task 1)
- ✅ localStorage persistence (Task 1)
- ✅ Follows system preference on first visit (Task 1)

## Placeholder Scan

None. All steps have complete code.

## Type Consistency

All types match across tasks.