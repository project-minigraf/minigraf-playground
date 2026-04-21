'use client'
import { useState } from 'react'

const PLACEHOLDER_LESSONS = [
  { id: 'lesson-1', title: 'Basic facts and queries', locked: false },
  { id: 'lesson-2', title: 'Rules and inference', locked: true },
  { id: 'lesson-3', title: 'Recursive rules', locked: true },
  { id: 'lesson-4', title: 'Bi-temporal time travel', locked: true },
]

interface LessonSidebarProps {
  activeLessonId: string | null
  onSelect: (id: string) => void
}

export function LessonSidebar({ activeLessonId, onSelect }: LessonSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="w-6 border-r border-gray-800 flex items-start pt-3 justify-center cursor-pointer" onClick={() => setCollapsed(false)}>
        <span className="text-gray-600 text-xs rotate-90 whitespace-nowrap">Lessons ▶</span>
      </div>
    )
  }

  return (
    <div className="w-52 border-r border-gray-800 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs uppercase tracking-widest text-gray-500">Lessons</span>
        <button onClick={() => setCollapsed(true)} className="text-gray-600 hover:text-white text-xs">◀</button>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {PLACEHOLDER_LESSONS.map((l) => (
          <li key={l.id}>
            <button
              onClick={() => !l.locked && onSelect(l.id)}
              disabled={l.locked}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                activeLessonId === l.id ? 'bg-blue-900/40 text-blue-300' : 'text-gray-400 hover:text-white disabled:opacity-40'
              }`}
            >
              {l.locked ? '🔒 ' : ''}{l.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}