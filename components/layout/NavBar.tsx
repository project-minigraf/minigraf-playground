'use client'
import { Settings } from 'lucide-react'

type Mode = 'sandbox' | 'lessons'

interface NavBarProps {
  mode: Mode
  onModeChange: (m: Mode) => void
  onSettingsOpen: () => void
}

export function NavBar({ mode, onModeChange, onSettingsOpen }: NavBarProps) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-950 shrink-0">
      <span className="font-bold text-white tracking-tight">Minigraf Playground</span>
      <div className="flex items-center gap-3">
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