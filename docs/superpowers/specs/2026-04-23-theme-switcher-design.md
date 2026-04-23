# Theme Switcher Design

**Date:** 2026-04-23
**Feature:** Theme switcher (light/dark mode)

## Overview

Add a theme toggle button to the NavBar, positioned to the left of the sandbox/lessons mode switcher.

## UI Structure

```
[Logo/Title]  [Theme Toggle] [Sandbox|Lessons] [Settings]
```

## Behavior

1. **Default:** Follow `prefers-color-scheme` on first visit (no saved preference)
2. **Persistence:** Manual choice saved to `localStorage` under key `'theme'` (`'light'` or `'dark'`)
3. **Toggle:** Clicking the button swaps between light and dark, persists choice

## Implementation

- Add theme toggle button to `NavBar.tsx`
- Use Lucide icons: `Sun` (light mode) / `Moon` (dark mode)
- Toggle applies/removes `dark` class on `document.documentElement`
- On load, read saved preference or follow system preference