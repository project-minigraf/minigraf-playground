import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { AppShell } from '@/components/layout/AppShell'
import type { LessonStep } from '@/lib/types'

const setSessionPrefsMock = jest.fn().mockResolvedValue(undefined)
const lessonSidebarSpy = jest.fn(() => <div>LessonSidebar</div>)

let mockLessonRunner: {
  lesson: { id: string; title: string; description: string; steps: { id: string }[] }
  currentStep: LessonStep | null
  starterCode: string
  completedSteps: string[]
  stepIndex: number
  totalSteps: number
  submitResult: jest.Mock
} = {
  lesson: { id: 'lesson-1', title: 'Lesson 1', description: '', steps: [{ id: 'step-1' }, { id: 'step-2' }] },
  currentStep: { id: 'step-1', instruction: 'Step 1', starterCode: '(query [:find ?x :where [:alice :friend ?x]])', hints: [], successMessage: 'ok' },
  starterCode: '(query [:find ?x :where [:alice :friend ?x]])',
  completedSteps: [],
  stepIndex: 0,
  totalSteps: 2,
  submitResult: jest.fn(),
}

jest.mock('next/dynamic', () => () => function MockQueryEditor({
  onResult,
}: {
  onResult?: (result: { columns: string[]; rows: string[][]; executionTimeMs: number }, code?: string) => void
}) {
  return (
    <div>
      <button
        data-testid="run-query"
        onClick={() => onResult?.({ columns: [], rows: [], executionTimeMs: 1 }, '(transact [[:a :b :c]])')}
      >
        Run
      </button>
    </div>
  )
})

jest.mock('@/components/layout/NavBar', () => ({
  NavBar: ({ onModeChange }: { onModeChange: (mode: 'sandbox' | 'lessons') => void }) => (
    <button onClick={() => onModeChange('lessons')}>Lessons</button>
  ),
}))

jest.mock('@/components/layout/ResizeHandle', () => ({
  ResizeHandle: () => <div>ResizeHandle</div>,
}))

jest.mock('@/components/results/ResultsPanel', () => ({
  ResultsPanel: () => <div>ResultsPanel</div>,
}))

jest.mock('@/components/lessons/LessonSidebar', () => ({
  LessonSidebar: (props: unknown) => lessonSidebarSpy(props),
}))

jest.mock('@/components/settings/SettingsDrawer', () => ({
  SettingsDrawer: () => <div>SettingsDrawer</div>,
}))

const chatPanelSpy = jest.fn(() => <div>ChatPanel</div>)
jest.mock('@/components/chat/ChatPanel', () => ({
  ChatPanel: (props: unknown) => chatPanelSpy(props),
}))

jest.mock('@/lib/storage', () => ({
  getSessionPrefs: jest.fn().mockResolvedValue({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    mode: 'lessons',
    activeLessonId: 'lesson-1',
  }),
  setSessionPrefs: (...args: unknown[]) => setSessionPrefsMock(...args),
  clearAllChatHistory: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/hooks/useMinigraf', () => ({
  useMinigraf: () => ({
    status: 'ready',
    error: null,
    query: jest.fn(),
  }),
}))

jest.mock('@/hooks/useLesson', () => ({
  useLesson: () => mockLessonRunner,
}))

describe('AppShell lesson intro trigger', () => {
  beforeEach(() => {
    chatPanelSpy.mockClear()
    lessonSidebarSpy.mockClear()
    setSessionPrefsMock.mockClear()
    mockLessonRunner = {
      lesson: { id: 'lesson-1', title: 'Lesson 1', description: '', steps: [{ id: 'step-1' }, { id: 'step-2' }] },
      currentStep: { id: 'step-1', instruction: 'Step 1', starterCode: '(query [:find ?x :where [:alice :friend ?x]])', hints: [], successMessage: 'ok' },
      starterCode: '(query [:find ?x :where [:alice :friend ?x]])',
      completedSteps: [],
      stepIndex: 0,
      totalSteps: 2,
      submitResult: jest.fn(),
    }
  })

  it('updates the chat intro trigger when the current lesson step changes', async () => {
    const { rerender } = render(<AppShell />)

    await waitFor(() => {
      expect(chatPanelSpy).toHaveBeenCalled()
    })

    const firstProps = chatPanelSpy.mock.calls.at(-1)?.[0] as { introTrigger: number }

    mockLessonRunner = {
      ...mockLessonRunner,
      currentStep: { id: 'step-2', instruction: 'Step 2', starterCode: '(query [:find ?y :where [:bob :friend ?y]])', hints: [], successMessage: 'ok' },
      starterCode: '(query [:find ?y :where [:bob :friend ?y]])',
      stepIndex: 1,
    }

    rerender(<AppShell />)

    await waitFor(() => {
      const latestProps = chatPanelSpy.mock.calls.at(-1)?.[0] as { introTrigger: number }
      expect(latestProps.introTrigger).not.toBe(firstProps.introTrigger)
    })
  })

  it('persists the active lesson id when switching into lessons mode', async () => {
    render(<AppShell />)

    const lessonsButton = document.querySelector('button')
    expect(lessonsButton).not.toBeNull()
    fireEvent.click(lessonsButton!)

    await waitFor(() => {
      expect(setSessionPrefsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'lessons',
          activeLessonId: 'lesson-1',
        })
      )
    })
  })

  it('passes the current lesson step progress into the sidebar', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(lessonSidebarSpy).toHaveBeenCalled()
    })

    const props = lessonSidebarSpy.mock.calls.at(-1)?.[0] as {
      activeLessonId: string | null
      currentStepIndex: number
      totalSteps: number
    }

    expect(props.activeLessonId).toBe('lesson-1')
    expect(props.currentStepIndex).toBe(0)
    expect(props.totalSteps).toBe(2)
  })

  it('passes completedOpenStep into introContext when an open-ended step completes', async () => {
    mockLessonRunner = {
      ...mockLessonRunner,
      currentStep: {
        id: 'step-open',
        instruction: 'Model your own dataset.',
        starterCode: '',
        hints: [],
        successMessage: 'Great!',
        // no expectedResult → open-ended
      },
      submitResult: jest.fn().mockResolvedValue(true),
    }

    const { getByTestId } = render(<AppShell />)
    await waitFor(() => {
      const props = chatPanelSpy.mock.calls.at(-1)?.[0] as { chatKey: string }
      expect(props?.chatKey).toBe('lesson-1')
    })

    await act(async () => {
      fireEvent.click(getByTestId('run-query'))
    })

    await waitFor(() => {
      const latestProps = chatPanelSpy.mock.calls.at(-1)?.[0] as {
        introContext?: { completedOpenStep?: { instruction: string; code: string } }
      }
      expect(latestProps.introContext?.completedOpenStep).toEqual({
        instruction: 'Model your own dataset.',
        code: expect.any(String),
      })
    })
  })

  it('does not pass completedOpenStep when the current step has an expectedResult', async () => {
    mockLessonRunner = {
      ...mockLessonRunner,
      currentStep: {
        id: 'step-1',
        instruction: 'Step 1',
        starterCode: '(query [:find ?x :where [:alice :friend ?x]])',
        hints: [],
        successMessage: 'ok',
        expectedResult: { columns: ['?x'], rows: [[':bob']] },
      },
      submitResult: jest.fn().mockResolvedValue(true),
    }

    const { getByTestId } = render(<AppShell />)
    await waitFor(() => {
      const props = chatPanelSpy.mock.calls.at(-1)?.[0] as { chatKey: string }
      expect(props?.chatKey).toBe('lesson-1')
    })

    await act(async () => {
      fireEvent.click(getByTestId('run-query'))
    })

    await waitFor(() => {
      expect(mockLessonRunner.submitResult).toHaveBeenCalled()
      const latestProps = chatPanelSpy.mock.calls.at(-1)?.[0] as {
        introContext?: { completedOpenStep?: unknown }
      }
      expect(latestProps.introContext?.completedOpenStep).toBeUndefined()
    })
  })
})
