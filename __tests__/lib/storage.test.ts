import {
  getGraphState, setGraphState,
  getSessionPrefs, setSessionPrefs,
  getApiKey, setApiKey, clearApiKey,
  getLessonProgress, setLessonProgress,
  getChatHistory, setChatHistory, clearChatHistory,
} from '@/lib/storage'

describe('graph_state', () => {
  it('returns null when empty', async () => {
    expect(await getGraphState()).toBeNull()
  })
  it('stores and retrieves content', async () => {
    await setGraphState('friend(alice, bob).')
    expect(await getGraphState()).toBe('friend(alice, bob).')
  })
})

describe('api_keys', () => {
  it('stores, retrieves, and clears a key', async () => {
    await setApiKey('anthropic', 'sk-test-123')
    expect(await getApiKey('anthropic')).toBe('sk-test-123')
    await clearApiKey('anthropic')
    expect(await getApiKey('anthropic')).toBeNull()
  })
})

describe('chat_history', () => {
  it('stores and clears messages', async () => {
    const msgs = [{ role: 'user' as const, content: 'hello', timestamp: 1 }]
    await setChatHistory('sandbox', msgs)
    expect((await getChatHistory('sandbox'))[0].content).toBe('hello')
    await clearChatHistory('sandbox')
    expect(await getChatHistory('sandbox')).toEqual([])
  })
})