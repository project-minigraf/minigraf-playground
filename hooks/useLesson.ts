'use client'
import { useCallback, useEffect, useState } from 'react'
import { LESSONS } from '@/lib/lessons'
import { getLessonProgress, setLessonProgress } from '@/lib/storage'
import { computeDiff } from '@/lib/tutor'
import type { Lesson, LessonStep, QueryResult } from '@/lib/types'

export function useLesson(lessonId: string | null) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  useEffect(() => {
    if (!lessonId) return
    const found = LESSONS.find((l) => l.id === lessonId) ?? null
    setLesson(found)
    getLessonProgress(lessonId).then((p) => {
      const completed = p?.completedSteps ?? []
      setCompletedSteps(completed)
      const idx = found?.steps.findIndex((s) => !completed.includes(s.id)) ?? 0
      setStepIndex(Math.max(0, idx))
    })
  }, [lessonId])

  const currentStep: LessonStep | null = lesson?.steps[stepIndex] ?? null

  const completeCurrentStep = useCallback(async () => {
    if (!currentStep || !lessonId) return

    const updated = completedSteps.includes(currentStep.id)
      ? completedSteps
      : [...completedSteps, currentStep.id]

    setCompletedSteps(updated)
    await setLessonProgress(lessonId, updated)
    setStepIndex((i) => i + 1)
  }, [completedSteps, currentStep, lessonId])

  const submitResult = useCallback(async (result: QueryResult): Promise<boolean> => {
    if (!currentStep || !lessonId) return false
    if (!currentStep.expectedResult) {
      await completeCurrentStep()
      return true
    }
    const diff = computeDiff(result, currentStep.expectedResult)
    const passed = diff.missing.length === 0 && diff.unexpected.length === 0
    if (passed) {
      await completeCurrentStep()
    }
    return passed
  }, [completeCurrentStep, currentStep, lessonId])

  return {
    lesson,
    currentStep,
    starterCode: currentStep?.starterCode ?? '',
    completedSteps,
    stepIndex,
    totalSteps: lesson?.steps.length ?? 0,
    submitResult,
  }
}
