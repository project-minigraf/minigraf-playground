/**
 * @jest-environment node
 */

jest.mock('@vercel/kv', () => ({
  kv: {
    incr: jest.fn().mockResolvedValue(1),
  },
}))

import { kv } from '@vercel/kv'
import { POST } from '@/app/api/event/route'

const mockIncr = kv.incr as jest.Mock

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/event', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 204 and increments the correct KV key for a valid event', async () => {
    const res = await POST(makeRequest({ event: 'query_run', date: '2026-06-21' }))
    expect(res.status).toBe(204)
    expect(mockIncr).toHaveBeenCalledWith('events:query_run:2026-06-21')
  })

  it('returns 400 for an unknown event name', async () => {
    const res = await POST(makeRequest({ event: 'fake_event', date: '2026-06-21' }))
    expect(res.status).toBe(400)
    expect(mockIncr).not.toHaveBeenCalled()
  })

  it('returns 400 for a malformed date', async () => {
    const res = await POST(makeRequest({ event: 'query_run', date: 'today' }))
    expect(res.status).toBe(400)
    expect(mockIncr).not.toHaveBeenCalled()
  })
})
