jest.mock('idb', () => ({
  openDB: jest.fn().mockRejectedValue(new Error('IDB unavailable')),
}))

import {
  getGraphState, setGraphState,
  getSessionPrefs, setSessionPrefs,
  getApiKey, setApiKey, clearApiKey,
  getLessonProgress, setLessonProgress,
  getChatHistory, setChatHistory, clearChatHistory,
} from '@/lib/storage'

describe('IndexedDB failure fallbacks', () => {
  it('getGraphState returns null when DB is unavailable', async () => {
    expect(await getGraphState()).toBeNull()
  })

  it('getSessionPrefs returns null when DB is unavailable', async () => {
    expect(await getSessionPrefs()).toBeNull()
  })

  it('getApiKey returns null when DB is unavailable', async () => {
    expect(await getApiKey('groq')).toBeNull()
  })

  it('getLessonProgress returns null when DB is unavailable', async () => {
    expect(await getLessonProgress('lesson-1')).toBeNull()
  })

  it('getChatHistory returns [] when DB is unavailable', async () => {
    expect(await getChatHistory('sandbox')).toEqual([])
  })

  it('setGraphState resolves without throwing when DB is unavailable', async () => {
    await expect(setGraphState('test')).resolves.toBeUndefined()
  })

  it('setSessionPrefs resolves without throwing when DB is unavailable', async () => {
    await expect(setSessionPrefs({ provider: 'groq', model: 'llama-3.3-70b-versatile', mode: 'sandbox' })).resolves.toBeUndefined()
  })

  it('setChatHistory resolves without throwing when DB is unavailable', async () => {
    await expect(setChatHistory('sandbox', [])).resolves.toBeUndefined()
  })
})
