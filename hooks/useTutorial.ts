'use client'
import { useState, useEffect, useCallback } from 'react'
import { TUTORIALS } from '@/lib/lessons'
import { getLessonProgress, getSessionPrefs, setSessionPrefs } from '@/lib/storage'
import type { Tutorial } from '@/lib/types'

export function useTutorial(initialTutorialId: string | null) {
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(
    initialTutorialId ?? TUTORIALS[0]?.id ?? null
  )
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [completedStepsPerLesson, setCompletedStepsPerLesson] = useState<
    Record<string, string[]>
  >({})

  const activeTutorial: Tutorial | null =
    TUTORIALS.find((t) => t.id === activeTutorialId) ?? null

  useEffect(() => {
    if (!activeTutorial) return
    Promise.all(
      activeTutorial.lessons.map((lesson) =>
        getLessonProgress(lesson.id).then(
          (p) => [lesson.id, p?.completedSteps ?? []] as const
        )
      )
    ).then((entries) => {
      const record = Object.fromEntries(entries)
      setCompletedStepsPerLesson((prev) => ({ ...prev, ...record }))
      const firstIncomplete =
        activeTutorial.lessons.find((lesson) => {
          const completed = record[lesson.id] ?? []
          return lesson.steps.some((step) => !completed.includes(step.id))
        }) ?? activeTutorial.lessons[0]
      setActiveLessonId(firstIncomplete?.id ?? null)
    })
  }, [activeTutorialId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isUnlocked = useCallback(
    (tutorialId: string): boolean => {
      const tutorial = TUTORIALS.find((t) => t.id === tutorialId)
      if (!tutorial) return false
      if (!tutorial.prerequisiteTutorialId) return true
      const prereq = TUTORIALS.find((t) => t.id === tutorial.prerequisiteTutorialId)
      if (!prereq) return true
      return prereq.lessons.every((lesson) =>
        lesson.steps.every((step) =>
          (completedStepsPerLesson[lesson.id] ?? []).includes(step.id)
        )
      )
    },
    [completedStepsPerLesson]
  )

  const switchTutorial = useCallback(async (tutorialId: string) => {
    setActiveTutorialId(tutorialId)
    const prefs = await getSessionPrefs()
    await setSessionPrefs({
      provider: prefs?.provider ?? 'groq',
      model: prefs?.model ?? 'llama-3.3-70b-versatile',
      mode: 'lessons',
      ...(prefs?.activeLessonId ? { activeLessonId: prefs.activeLessonId } : {}),
      activeTutorialId: tutorialId,
    })
  }, [])

  return {
    activeTutorial,
    activeLessonId,
    setActiveLessonId,
    switchTutorial,
    isUnlocked,
    completedStepsPerLesson,
    setCompletedStepsPerLesson,
  }
}
