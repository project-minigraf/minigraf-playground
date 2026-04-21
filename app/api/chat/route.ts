import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const TOKEN_CAP = parseInt(process.env.ANON_FALLBACK_TOKEN_CAP ?? '10000')
const COOKIE_NAME = 'anon-tokens'
const secret = new TextEncoder().encode(process.env.COOKIE_SECRET ?? 'dev-secret-change-me')

async function getUsedTokens(req: NextRequest): Promise<number> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (!cookie) return 0
  try {
    const { payload } = await jwtVerify(cookie, secret)
    return (payload.used as number) ?? 0
  } catch { return 0 }
}

async function makeTokenCookie(used: number): Promise<string> {
  const token = await new SignJWT({ used })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    messages?: { role: 'user' | 'assistant' | 'system'; content: string }[]
    provider?: string
    model?: string
    systemPrompt?: string
    test?: boolean
    userKey?: string  // Only accepted when provider === 'anthropic' (CORS prevents direct browser calls)
  }

  const { messages, provider = 'groq', model = 'llama-3.3-70b-versatile', systemPrompt, test, userKey } = body
  console.log('[proxy] provider:', provider, 'userKey:', userKey ? 'present' : 'null', 'isAnthropic:', provider === 'anthropic')

  // userKey is only accepted for Anthropic — all other providers must call their APIs directly from the browser
  if (userKey && provider !== 'anthropic') {
    return new Response(
      JSON.stringify({ error: 'invalid_request', message: 'userKey may only be proxied for Anthropic. Call other providers directly from the browser.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const isAnthropicByok = provider === 'anthropic' && !!userKey

  // Anthropic BYOK: proxy the request server-side (Anthropic's API does not support browser CORS)
  if (isAnthropicByok) {
    if (test) {
      // Verify key server-side — browser cannot call Anthropic directly
      const check = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': userKey, 'anthropic-version': '2023-06-01' },
      })
      return new Response(null, { status: check.ok ? 200 : check.status })
    }
    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...(messages ?? [])]
      : messages ?? []
    const llm = createAnthropic({ apiKey: userKey })(model)
    const result = await streamText({ model: llm, messages: allMessages })
    return result.toTextStreamResponse()
  }

  // Groq anonymous fallback — enforce token cap
  const used = await getUsedTokens(req)
  if (used >= TOKEN_CAP) {
    return new Response(
      JSON.stringify({ error: 'free_quota_exhausted', message: 'Free quota used up. Add your own API key for unlimited access.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (test) {
    return new Response('ok', { headers: { 'Content-Type': 'text/plain' } })
  }

  const allMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...(messages ?? [])]
    : messages ?? []

  const llm = createGroq({ apiKey: process.env.GROQ_API_KEY ?? '' })(model)
  const result = await streamText({ model: llm, messages: allMessages })
  const response = result.toTextStreamResponse()

  const approxTokens = JSON.stringify(messages).length / 4
  response.headers.set('Set-Cookie', await makeTokenCookie(used + approxTokens))

  return response
}