import { renderHook, waitFor } from '@testing-library/react'
import { useMinigraf, _clearInstanceCache } from '@/hooks/useMinigraf'
import { loadMinigraf } from '@/lib/wasm-loader'

const mockClose = jest.fn()
const mockExecute = jest.fn().mockResolvedValue('{"variables":[],"results":[]}')

jest.mock('@/lib/wasm-loader', () => ({
  loadMinigraf: jest.fn((dbName: string) =>
    Promise.resolve({ execute: mockExecute, close: mockClose, _db: dbName })
  ),
}))

beforeEach(() => {
  _clearInstanceCache?.()
  mockClose.mockClear()
  ;(loadMinigraf as jest.Mock).mockClear()
})

describe('useMinigraf LRU cache', () => {
  it('reuses the cached instance for the same tutorialId', async () => {
    const { result: r1 } = renderHook(() => useMinigraf('tutorial-a'))
    const { result: r2 } = renderHook(() => useMinigraf('tutorial-a'))
    await waitFor(() => expect(r1.current.status).toBe('ready'))
    await waitFor(() => expect(r2.current.status).toBe('ready'))
    expect(loadMinigraf).toHaveBeenCalledTimes(1)
  })

  it('evicts the LRU instance when MAX_CACHED_INSTANCES is exceeded', async () => {
    const { result: r1 } = renderHook(() => useMinigraf('tutorial-a'))
    await waitFor(() => expect(r1.current.status).toBe('ready'))
    const { result: r2 } = renderHook(() => useMinigraf('tutorial-b'))
    await waitFor(() => expect(r2.current.status).toBe('ready'))
    // Opening a third tutorial should evict tutorial-a (LRU)
    const { result: r3 } = renderHook(() => useMinigraf('tutorial-c'))
    await waitFor(() => expect(r3.current.status).toBe('ready'))
    expect(mockClose).toHaveBeenCalledTimes(1)
    expect(loadMinigraf).toHaveBeenCalledTimes(3)
  })
})
