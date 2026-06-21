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
