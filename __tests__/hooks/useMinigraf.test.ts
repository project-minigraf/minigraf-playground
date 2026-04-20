import { renderHook, act, waitFor } from '@testing-library/react'
import { useMinigraf } from '@/hooks/useMinigraf'

const mockExecute = jest.fn().mockResolvedValue(
  JSON.stringify({ variables: ['?x'], results: [['bob']] })
)

jest.mock('/wasm/pkg/minigraf.js', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
  BrowserDb: {
    open: jest.fn().mockResolvedValue({
      execute: mockExecute,
      free: jest.fn(),
    }),
  },
}))

it('returns query results', async () => {
  const { result } = renderHook(() => useMinigraf())
  
  // Wait for hook to initialize - give it 5 seconds
  await waitFor(() => {
    if (result.current.status !== 'ready') {
      throw new Error('Not ready')
    }
  }, { timeout: 5000 })
  
  const qr = await result.current.query('?- friend(alice, ?x).')
  expect(qr.columns).toEqual(['?x'])
  expect(qr.rows).toEqual([['bob']])
})
