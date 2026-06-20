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
    const allLessons = TUTORIALS.flatMap((t) => t.lessons)
    if (allLessons.length === 0) return
    Promise.all(
      allLessons.map((lesson) =>
        getLessonProgress(lesson.id).then(
          (p) => [lesson.id, p?.completedSteps ?? []] as const
        )
      )
    ).then((entries) => {
      const record = Object.fromEntries(entries)
      setCompletedStepsPerLesson(record)
      if (!activeTutorial) return
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
      return TUTORIALS.some((t) => t.id === tutorialId)
    },
    []
  )

  const switchTutorial = useCallback(async (tutorialId: string) => {
    if (!isUnlocked(tutorialId)) return
    setActiveTutorialId(tutorialId)
    const prefs = await getSessionPrefs()
    await setSessionPrefs({
      provider: prefs?.provider ?? 'groq',
      model: prefs?.model ?? 'llama-3.3-70b-versatile',
      mode: 'lessons',
      ...(prefs?.activeLessonId ? { activeLessonId: prefs.activeLessonId } : {}),
      activeTutorialId: tutorialId,
    })
  }, [isUnlocked])

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
