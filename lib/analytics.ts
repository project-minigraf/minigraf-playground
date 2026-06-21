import type { EventName } from './types'

export function trackEvent(event: EventName): void {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  fetch('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, date }),
  }).catch(() => {}) // fire-and-forget, never throws
}
