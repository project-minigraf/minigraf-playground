import { kv } from '@vercel/kv'
import type { EventName } from '@/lib/types'

export const runtime = 'edge'

const VALID_EVENTS = new Set<EventName>([
  'lesson_started',
  'lesson_completed',
  'query_run',
  'tutor_message_sent',
  'outbound_click_github',
  'outbound_click_crates',
  'outbound_click_wiki',
  'outbound_click_docs_rs',
])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: Request) {
  let body: { event: string; date: string }
  try {
    body = await req.json()
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!VALID_EVENTS.has(body.event as EventName) || !DATE_RE.test(body.date)) {
    return new Response(null, { status: 400 })
  }
  await kv.incr(`events:${body.event}:${body.date}`)
  return new Response(null, { status: 204 })
}
