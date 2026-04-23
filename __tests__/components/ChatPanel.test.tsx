import { render, waitFor } from '@testing-library/react'
import { ChatPanel } from '@/components/chat/ChatPanel'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}))

jest.mock('lucide-react', () => ({
  Trash2: () => null,
  Copy: () => null,
  Check: () => null,
  Play: () => null,
}))

jest.mock('@/lib/storage', () => ({
  setChatHistory: jest.fn(),
  clearChatHistory: jest.fn().mockResolvedValue(undefined),
  getApiKey: jest.fn().mockResolvedValue('test-key'),
}))

const { clearChatHistory } = jest.requireMock('@/lib/storage') as {
  clearChatHistory: jest.Mock
}

describe('ChatPanel lesson intro', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Lesson intro' } }],
      }),
    }) as unknown as typeof fetch
  })

  it('starts a fresh lesson intro even if stale history exists for that chat key', async () => {
    render(
      <ChatPanel
        chatKey="lesson-1"
        provider="openai"
        model="gpt-test"
        systemPrompt="system"
        introEnabled
        introTrigger={1}
        introContext={{
          lessonTitle: 'Basic Facts and Queries',
          lessonGoals: 'facts and queries',
          currentStep: 'Step 1',
        }}
        onOpenSettings={() => {}}
      />
    )

    await waitFor(() => expect(clearChatHistory).toHaveBeenCalledWith('lesson-1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, request] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain('openai.com')
    expect(JSON.parse(request.body as string)).toMatchObject({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Basic Facts and Queries'),
        }),
      ]),
    })
  })

  it('does not ask for a repeated self-introduction on later intro triggers for the same conversation', async () => {
    const { rerender } = render(
      <ChatPanel
        chatKey="lesson-1"
        provider="openai"
        model="gpt-test"
        systemPrompt="system"
        introEnabled
        introTrigger={1}
        introContext={{
          lessonTitle: 'Basic Facts and Queries',
          lessonGoals: 'facts and queries',
          currentStep: 'Step 1',
        }}
        onOpenSettings={() => {}}
      />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    rerender(
      <ChatPanel
        chatKey="lesson-1"
        provider="openai"
        model="gpt-test"
        systemPrompt="system"
        introEnabled
        introTrigger={2}
        introContext={{
          lessonTitle: 'Basic Facts and Queries',
          lessonGoals: 'facts and queries',
          currentStep: 'Step 2',
        }}
        onOpenSettings={() => {}}
      />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    expect(clearChatHistory).toHaveBeenCalledTimes(1)

    const [, secondRequest] = (global.fetch as jest.Mock).mock.calls[1]
    expect(JSON.parse(secondRequest.body as string)).toMatchObject({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Do not re-introduce yourself'),
        }),
      ]),
    })
  })
})
