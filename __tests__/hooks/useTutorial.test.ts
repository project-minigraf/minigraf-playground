import { renderHook, act, waitFor } from '@testing-library/react'

const mockGetSessionPrefs = jest.fn().mockResolvedValue(null)
const mockSetSessionPrefs = jest.fn().mockResolvedValue(undefined)
const mockGetLessonProgress = jest.fn().mockResolvedValue(null)

jest.mock('@/lib/storage', () => ({
  getLessonProgress: (...args: unknown[]) => mockGetLessonProgress(...args),
  getSessionPrefs: () => mockGetSessionPrefs(),
  setSessionPrefs: (...args: unknown[]) => mockSetSessionPrefs(...args),
}))

jest.mock('@/lib/lessons', () => ({
  TUTORIALS: [
    {
      id: 'basic-datalog',
      title: 'Basic Datalog',
      description: '',
      goals: '',
      lessons: [
        {
          id: 'lesson-1',
          title: 'L1',
          description: '',
          steps: [{ id: 'l1-s1' }, { id: 'l1-s2' }],
        },
      ],
    },
    {
      id: 'marketplace',
      title: 'Marketplace',
      description: '',
      goals: '',
      prerequisiteTutorialId: 'basic-datalog',
      lessons: [
        {
          id: 'mp-lesson-1',
          title: 'MP L1',
          description: '',
          steps: [{ id: 'mp-s1' }],
        },
      ],
    },
  ],
}))

import { useTutorial } from '@/hooks/useTutorial'

beforeEach(() => {
  mockGetLessonProgress.mockResolvedValue(null)
  mockGetSessionPrefs.mockResolvedValue(null)
  mockSetSessionPrefs.mockClear()
})

describe('useTutorial', () => {
  it('known tutorials are always unlocked', async () => {
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeTutorial?.id).toBe('basic-datalog'))
    expect(result.current.isUnlocked('basic-datalog')).toBe(true)
    expect(result.current.isUnlocked('marketplace')).toBe(true)
  })

  it('unknown tutorial id returns false from isUnlocked', async () => {
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeTutorial).not.toBeNull())
    expect(result.current.isUnlocked('nonexistent')).toBe(false)
  })

  it('switchTutorial persists activeTutorialId to session prefs', async () => {
    mockGetSessionPrefs.mockResolvedValue({ provider: 'groq', model: 'llama' })
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeTutorial?.id).toBe('basic-datalog'))
    await act(async () => { result.current.switchTutorial('marketplace') })
    expect(mockSetSessionPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ activeTutorialId: 'marketplace' })
    )
  })

  it('defaults activeLessonId to first incomplete lesson', async () => {
    mockGetLessonProgress.mockResolvedValue({ completedSteps: ['l1-s1', 'l1-s2'] })
    // lesson-1 is fully complete; with only one fully-complete lesson, falls back to first lesson
    const { result } = renderHook(() => useTutorial('basic-datalog'))
    await waitFor(() => expect(result.current.activeLessonId).toBe('lesson-1'))
  })
})
