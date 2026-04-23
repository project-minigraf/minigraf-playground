'use client'
import { useState } from 'react'
import { LESSONS } from '@/lib/lessons'

const LESSON_ORDER = LESSONS.map((lesson) => lesson.id)
const LESSON_TITLES = Object.fromEntries(
  LESSONS.map((lesson) => [lesson.id, lesson.title])
) as Record<string, string>

interface LessonSidebarProps {
  activeLessonId: string | null
  completedStepsPerLesson: Record<string, string[]>
  currentStepIndex?: number
  totalSteps?: number
  onSelect: (id: string) => void
}

export function LessonSidebar({ activeLessonId, completedStepsPerLesson, currentStepIndex = 0, totalSteps = 0, onSelect }: LessonSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const isUnlocked = (lessonId: string) => {
    if (lessonId === 'lesson-1') return true
    const idx = LESSON_ORDER.indexOf(lessonId)
    if (idx <= 0) return false
    const prevLesson = LESSON_ORDER[idx - 1]
    return (completedStepsPerLesson[prevLesson]?.length ?? 0) > 0
  }

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
        {activeLessonId && (
          <span className="text-xs text-blue-400">Step {currentStepIndex + 1}/{totalSteps || '?'}</span>
        )}
        <button onClick={() => setCollapsed(true)} className="text-gray-600 hover:text-white text-xs">◀</button>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {LESSON_ORDER.map((id) => {
          const locked = !isUnlocked(id)
          return (
            <li key={id}>
              <button
                onClick={() => !locked && onSelect(id)}
                disabled={locked}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeLessonId === id ? 'bg-blue-900/40 text-blue-300' : 'text-gray-400 hover:text-white disabled:opacity-40'
                }`}
              >
                {locked ? '🔒 ' : ''}{LESSON_TITLES[id] ?? id}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
