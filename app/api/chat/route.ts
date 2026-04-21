import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
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

function getModel(provider: string, model: string, userKey?: string) {
  switch (provider) {
    case 'anthropic': return createAnthropic({ apiKey: userKey })(model)
    case 'openai': return createOpenAI({ apiKey: userKey })(model)
    case 'gemini': return createGoogleGenerativeAI({ apiKey: userKey })(model)
    case 'xai': return createXai({ apiKey: userKey })(model)
    default: return createGroq({ apiKey: process.env.GROQ_API_KEY })('llama-3.3-70b-versatile')
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    messages?: { role: 'user' | 'assistant' | 'system'; content: string }[]
    userKey?: string
    provider?: string
    model?: string
    systemPrompt?: string
    test?: boolean
  }
  const { messages, userKey, provider = 'groq', model = 'llama-3.3-70b-versatile', systemPrompt, test } = body
  const usingFallback = !userKey

  if (usingFallback) {
    const used = await getUsedTokens(req)
    if (used >= TOKEN_CAP) {
      return new Response(
        JSON.stringify({ error: 'free_quota_exhausted', message: 'Free quota used up. Add your own API key for unlimited access.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const llm = usingFallback
    ? createGroq({ apiKey: process.env.GROQ_API_KEY ?? '' })('llama-3.3-70b-versatile')
    : getModel(provider, model, userKey)

  if (test) {
    return new Response('ok', { headers: { 'Content-Type': 'text/plain' } })
  }

  const allMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...(messages ?? [])]
    : messages ?? []

  const result = await streamText({ model: llm, messages: allMessages })
  const response = result.toTextStreamResponse()
  
  if (usingFallback) {
    const approxTokens = JSON.stringify(messages).length / 4
    const used = await getUsedTokens(req)
    response.headers.set('Set-Cookie', await makeTokenCookie(used + approxTokens))
  }

  return response
}