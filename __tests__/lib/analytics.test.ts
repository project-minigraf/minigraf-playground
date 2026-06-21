import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('POSTs the correct event name and a YYYY-MM-DD date to /api/event', () => {
    trackEvent('query_run')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/event')
    expect(init.method).toBe('POST')

    const body = JSON.parse(init.body as string) as { event: string; date: string }
    expect(body.event).toBe('query_run')
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not throw when fetch rejects', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'))
    expect(() => trackEvent('lesson_started')).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
