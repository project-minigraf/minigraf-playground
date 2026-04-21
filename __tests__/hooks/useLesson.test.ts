import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import { useLesson } from '@/hooks/useLesson'

beforeEach(() => {
  cleanup()
})

jest.mock('@/lib/lessons', () => ({
  LESSONS: [
    {
      id: 'test-lesson',
      title: 'Test',
      description: 'Test lesson',
      steps: [
        {
          id: 'step-1',
          instruction: 'Step 1',
          starterCode: 'friend(alice, bob).',
          expectedResult: { columns: ['?x'], rows: [['bob']] },
          hints: [],
          successMessage: 'Great!',
        },
        {
          id: 'step-2',
          instruction: 'Step 2',
          starterCode: '',
          hints: [],
          successMessage: 'Done!',
        },
      ],
    },
  ],
}))

jest.mock('@/lib/storage', () => ({
  getLessonProgress: jest.fn().mockResolvedValue(null),
  setLessonProgress: jest.fn().mockResolvedValue(undefined),
}))

describe('useLesson', () => {
  it('loads first step on mount', async () => {
    const { result } = renderHook(() => useLesson('test-lesson'))
    await waitFor(() => expect(result.current.lesson).not.toBeNull())
    expect(result.current.currentStep?.id).toBe('step-1')
    expect(result.current.starterCode).toBe('friend(alice, bob).')
  })

  it('advances on correct result', async () => {
    const { result } = renderHook(() => useLesson('test-lesson'))
    await waitFor(() => expect(result.current.lesson).not.toBeNull())

    let passed: boolean | undefined
    await act(async () => {
      passed = await result.current.submitResult({
        columns: ['?x'],
        rows: [['bob']],
        executionTimeMs: 1,
      })
    })
    expect(passed).toBe(true)
    await waitFor(() => expect(result.current.currentStep?.id).toBe('step-2'))
  })

  it('does not advance on wrong result', async () => {
    const { result } = renderHook(() => useLesson('test-lesson'))
    await waitFor(() => expect(result.current.lesson).not.toBeNull())

    let passed: boolean | undefined
    await act(async () => {
      passed = await result.current.submitResult({
        columns: ['?x'],
        rows: [['wrong']],
        executionTimeMs: 1,
      })
    })
    expect(passed).toBe(false)
    expect(result.current.currentStep?.id).toBe('step-1')
  })

  it('returns null lesson when lessonId is null', async () => {
    const { result } = renderHook(() => useLesson(null))
    await waitFor(() => expect(result.current.lesson).toBeNull())
    expect(result.current.currentStep).toBeNull()
    expect(result.current.starterCode).toBe('')
  })

  it('persists progress to IndexedDB', async () => {
    const { result } = renderHook(() => useLesson('test-lesson'))
    await waitFor(() => expect(result.current.lesson).not.toBeNull())

    await act(async () => {
      await result.current.submitResult({
        columns: ['?x'],
        rows: [['bob']],
        executionTimeMs: 1,
      })
    })
    await waitFor(() => expect(result.current.completedSteps).toContain('step-1'))
    expect(result.current.completedSteps).toContain('step-1')
  })
})