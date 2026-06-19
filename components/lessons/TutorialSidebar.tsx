'use client'
import { useState } from 'react'
import { TUTORIALS } from '@/lib/lessons'
import type { Tutorial, Lesson } from '@/lib/types'

interface TutorialSidebarProps {
  activeTutorial: Tutorial | null
  activeLessonId: string | null
  completedStepsPerLesson: Record<string, string[]>
  currentStepIndex?: number
  totalSteps?: number
  isUnlocked: (tutorialId: string) => boolean
  onSelectLesson: (id: string) => void
  onSwitchTutorial: (id: string) => void
}

function isLessonComplete(lesson: Lesson, completedStepsPerLesson: Record<string, string[]>) {
  const completed = completedStepsPerLesson[lesson.id] ?? []
  return lesson.steps.length > 0 && lesson.steps.every((s) => completed.includes(s.id))
}

export function TutorialSidebar({
  activeTutorial,
  activeLessonId,
  completedStepsPerLesson,
  currentStepIndex = 0,
  totalSteps = 0,
  isUnlocked,
  onSelectLesson,
  onSwitchTutorial,
}: TutorialSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (collapsed) {
    return (
      <div
        className="w-6 border-r border-gray-800 flex items-start pt-3 justify-center cursor-pointer"
        onClick={() => setCollapsed(false)}
      >
        <span className="text-gray-600 text-xs rotate-90 whitespace-nowrap">
          Lessons ▶
        </span>
      </div>
    )
  }

  return (
    <div className="w-52 border-r border-gray-800 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full text-left text-xs text-blue-400 hover:text-blue-300 truncate mb-1"
        >
          Tutorial: {activeTutorial?.title ?? '—'} ▾
        </button>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ↩ Switch tutorial
        </button>
      </div>

      {/* Tutorial dropdown */}
      {dropdownOpen && (
        <div className="border-b border-gray-800 py-1">
          {TUTORIALS.map((tutorial) => {
            const unlocked = isUnlocked(tutorial.id)
            const active = tutorial.id === activeTutorial?.id
            const totalInTutorial = tutorial.lessons.reduce(
              (sum, l) => sum + l.steps.length,
              0
            )
            const completedInTutorial = tutorial.lessons.reduce(
              (sum, l) => sum + (completedStepsPerLesson[l.id] ?? []).length,
              0
            )
            const allComplete =
              totalInTutorial > 0 && completedInTutorial === totalInTutorial

            return (
              <button
                key={tutorial.id}
                disabled={!unlocked}
                title={
                  !unlocked
                    ? 'Complete Basic Datalog to unlock'
                    : undefined
                }
                onClick={() => {
                  if (!unlocked) return
                  onSwitchTutorial(tutorial.id)
                  setDropdownOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  active
                    ? 'text-blue-300 bg-blue-900/20'
                    : unlocked
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                {!unlocked ? '🔒 ' : allComplete ? '✓ ' : ''}
                {tutorial.title}
                {unlocked && !allComplete && totalInTutorial > 0 && (
                  <span className="ml-1 text-gray-600">
                    {completedInTutorial}/{totalInTutorial}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Lessons list */}
      <ul className="flex-1 overflow-y-auto py-2">
        {(activeTutorial?.lessons ?? []).map((lesson) => {
          const complete = isLessonComplete(lesson, completedStepsPerLesson)
          const active = lesson.id === activeLessonId
          return (
            <li key={lesson.id}>
              <button
                onClick={() => onSelectLesson(lesson.id)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {complete ? '● ' : active ? '→ ' : '○ '}
                {lesson.title}
              </button>
              {active && totalSteps > 0 && (
                <div className="px-3 pb-1 text-xs text-gray-600">
                  Step {currentStepIndex + 1}/{totalSteps}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-800 flex justify-end">
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-600 hover:text-white text-xs"
        >
          ◀
        </button>
      </div>
    </div>
  )
}
