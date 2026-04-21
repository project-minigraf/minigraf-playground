'use client'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Trash2 } from 'lucide-react'
import { AnonCapBanner } from './AnonCapBanner'
import { getChatHistory, setChatHistory, clearChatHistory, getApiKey } from '@/lib/storage'
import type { ChatMessage as StoredChatMessage, Provider } from '@/lib/types'

interface ChatPanelProps {
  chatKey: string
  provider: string
  model: string
  systemPrompt: string
  onOpenSettings: () => void
}

function roleToAlignment(role: string) {
  return role === 'user' ? 'justify-end' : 'justify-start'
}
function roleToBg(role: string) {
  return role === 'user' ? 'bg-blue-600' : 'bg-gray-800'
}

function getProviderUrl(provider: string, model: string, apiKey?: string): string {
  switch (provider) {
    case 'anthropic': return 'https://api.anthropic.com/v1/messages'
    case 'openai': return 'https://api.openai.com/v1/chat/completions'
    case 'xai': return 'https://api.x.ai/v1/chat/completions'
    case 'gemini': return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey ?? '')}`
    default: return '/api/chat'
  }
}

function getAuthHeader(provider: string, apiKey: string): Record<string, string> {
  switch (provider) {
    case 'anthropic': return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    case 'openai':
    case 'xai': return { 'Authorization': `Bearer ${apiKey}` }
    case 'gemini': return {}
    default: return {}
  }
}

function getProviderBody(provider: string, messages: { role: string; content: string }[], model: string): Record<string, unknown> {
  const base = { model, messages, max_tokens: 64 }
  switch (provider) {
    case 'anthropic': return base
    case 'openai':
    case 'xai': return base
    case 'gemini': return { contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }
    default: return base
  }
}

export function ChatPanel({ chatKey, provider, model, systemPrompt, onOpenSettings }: ChatPanelProps) {
  const [showAnonBanner, setShowAnonBanner] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<StoredChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    getChatHistory(chatKey).then(setMessages)
  }, [chatKey])

  useEffect(() => {
    if (messages.length > 0) {
      setChatHistory(chatKey, messages)
    }
  }, [chatKey, messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userInput = input.trim()
    setInput('')
    setLoading(true)

    abortRef.current = new AbortController()

    const userMsg: StoredChatMessage = { role: 'user', content: userInput, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])

    const allMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content: userInput }]
      : [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content: userInput }]

    try {
      const userKey = await getApiKey(provider as Provider)
      const isDirectCall = userKey && provider !== 'anthropic'

      if (isDirectCall) {
        const url = getProviderUrl(provider, model, userKey)
        const headers = { ...getAuthHeader(provider, userKey), 'Content-Type': 'application/json' }
        const body = getProviderBody(provider, allMessages, model)

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
          throw new Error(err.message || `API error: ${res.status}`)
        }

        const data = await res.json() as Record<string, unknown>
        let text = ''

        if (provider === 'gemini') {
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

        const assistantMsg: StoredChatMessage = { role: 'assistant', content: text, timestamp: Date.now() }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        const proxyBody = userKey
          ? { messages: allMessages, provider, model, userKey }
          : { messages: allMessages }

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proxyBody),
          signal: abortRef.current.signal,
        })

        if (res.status === 429) {
          setShowAnonBanner(true)
          throw new Error('Free quota used up')
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
          throw new Error(err.message || 'Request failed')
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        let assistantContent = ''
        const decoder = new TextDecoder()

        const assistantMsg: StoredChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
        setMessages((prev) => [...prev, assistantMsg])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantContent += chunk
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
      const errorContent = errorMsg.includes('429') || errorMsg.includes('free_quota')
        ? 'Free quota used up. Add your own API key for unlimited access.'
        : `Error: ${errorMsg}`
      const assistantMsg: StoredChatMessage = { role: 'assistant', content: errorContent, timestamp: Date.now() }
      setMessages((prev) => [...prev, assistantMsg])
      if (errorMsg.includes('Free quota') || errorMsg.includes('429')) {
        setShowAnonBanner(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    setMessages([])
    setShowAnonBanner(false)
    await clearChatHistory(chatKey)
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-sm font-medium text-gray-300">AI Tutor</span>
        <button
          onClick={handleClear}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Anon banner */}
      {showAnonBanner && <AnonCapBanner onOpenSettings={onOpenSettings} />}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${roleToAlignment(m.role)}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 ${roleToBg(m.role)}`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-white text-sm whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && messages.length > 0 && messages[messages.length - 1].role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-gray-400 text-sm">
              <span className="animate-pulse">⋯</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the graph..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
          >
            {loading ? '⋯' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}