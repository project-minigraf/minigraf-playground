'use client'
import { useState, useEffect } from 'react'
import { Settings, Sun, Moon } from 'lucide-react'

type Mode = 'sandbox' | 'lessons'

interface NavBarProps {
  mode: Mode
  onModeChange: (m: Mode) => void
  onSettingsOpen: () => void
}

const darkStyles = {
  header: 'border-gray-800 bg-gray-950',
  title: 'text-white',
  icon: 'text-gray-400 hover:text-white',
  modeSwitcherBorder: 'border-gray-700',
  modeButtonInactive: 'text-gray-400 hover:text-white',
}

const lightStyles = {
  header: 'border-gray-200 bg-white',
  title: 'text-gray-900',
  icon: 'text-gray-600 hover:text-gray-900',
  modeSwitcherBorder: 'border-gray-200',
  modeButtonInactive: 'text-gray-600 hover:text-gray-900',
}

export function NavBar({ mode, onModeChange, onSettingsOpen }: NavBarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const current = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(current)
    document.documentElement.classList.toggle('dark', current === 'dark')
  }, [])

  const isDark = theme === 'dark'
  const styles = isDark ? darkStyles : lightStyles

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <header className={`h-12 flex items-center justify-between px-4 border-b shrink-0 ${styles.header}`}>
      <span className={`font-bold tracking-tight ${styles.title}`}>Minigraf Playground</span>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`transition-colors ${styles.icon}`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className={`flex rounded-lg overflow-hidden border text-sm ${styles.modeSwitcherBorder}`}>
          {(['sandbox', 'lessons'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1 capitalize transition-colors ${mode === m ? 'bg-blue-600 text-white' : styles.modeButtonInactive}`}
            >
              {m}
            </button>
          ))}
        </div>
        <button onClick={onSettingsOpen} className={`transition-colors ${styles.icon}`}>
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}