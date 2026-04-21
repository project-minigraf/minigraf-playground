'use client'
import { useState, useRef } from 'react'
import type { ChatMessage, Provider } from '@/lib/types'

function getAuthHeader(provider: Provider, apiKey: string): Record<string, string> {
  switch (provider) {
    case 'anthropic': return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    case 'openai': 
    case 'xai': return { 'Authorization': `Bearer ${apiKey}` }
    case 'gemini': return { 'x-goog-api-key': apiKey }
  }
}

function getProviderUrl(provider: Provider, model: string): string {
  switch (provider) {
    case 'anthropic': return 'https://api.anthropic.com/v1/messages'
    case 'openai': return 'https://api.openai.com/v1/chat/completions'
    case 'gemini': return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    case 'xai': return 'https://api.x.ai/v1/chat/completions'
  }
}

function getProviderBody(provider: Provider, messages: { role: string; content: string }[], model: string): Record<string, unknown> {
  const base = { model, messages, max_tokens: 64 }
  switch (provider) {
    case 'anthropic': return base
    case 'openai': 
    case 'xai': return base
    case 'gemini': return { contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }
  }
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function sendMessage(
    content: string,
    provider: Provider,
    model: string,
    apiKey: string | null,
    systemPrompt?: string
  ) {
    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    abortRef.current = new AbortController()

    try {
      if (apiKey) {
        // BYOK path: call provider directly from browser
        const allMessages = systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content }]
          : [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content }]

        const url = getProviderUrl(provider, model)
        const headers = { ...getAuthHeader(provider, apiKey), 'Content-Type': 'application/json' }
        const body = getProviderBody(provider, allMessages, model)

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`)
        }

        const data = await res.json() as Record<string, unknown>
        let text = ''
        
        if (provider === 'anthropic') {
          const content = data.content as unknown[] | undefined
          text = content?.[0] && typeof content[0] === 'object' 
            ? (content[0] as Record<string, unknown>).text as string 
            : ''
        } else if (provider === 'gemini') {
          const candidates = data.candidates as unknown[] | undefined
          const firstCandidate = candidates?.[0] as Record<string, unknown> | undefined
          const candidateContent = firstCandidate?.content as Record<string, unknown> | undefined
          const parts = candidateContent?.parts as unknown[] | undefined
          text = parts?.[0] as string ?? ''
        } else {
          const choices = data.choices as unknown[] | undefined
          const firstChoice = choices?.[0] as Record<string, unknown> | undefined
          const message = firstChoice?.message as Record<string, unknown> | undefined
          text = message?.content as string ?? ''
        }

        const assistantMsg: ChatMessage = { role: 'assistant', content: text, timestamp: Date.now() }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        // Fallback: call /api/chat (Groq)
        const allMessages = systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content }]
          : [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content }]

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Request failed')
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        let assistantContent = ''
        const decoder = new TextDecoder()

        // Create assistant message placeholder
        const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
        setMessages((prev) => [...prev, assistantMsg])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          assistantContent += chunk
          // Update the last message incrementally
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...assistantMsg, content: assistantContent }
            return updated
          })
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      const assistantMsg: ChatMessage = { role: 'assistant', content: `Error: ${errorMsg}`, timestamp: Date.now() }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setLoading(false)
    }
  }

  function clearMessages() {
    setMessages([])
  }

  function abort() {
    abortRef.current?.abort()
    setLoading(false)
  }

  return { messages, sendMessage, clearMessages, loading, abort }
}
