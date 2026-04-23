'use client'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Trash2, Copy, Check, Play } from 'lucide-react'

function CodeBlock({ language, children, onRun }: { language: string; children: React.ReactNode; onRun?: (code: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const code = String(children).replace(/\n$/, '')
  const prismLanguage = language === 'datalog' ? 'clojure' : language

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRun = async () => {
    if (!onRun) return
    setRunning(true)
    try {
      onRun(code)
    } finally {
      setTimeout(() => setRunning(false), 500)
    }
  }

  return (
    <div className="relative group overflow-x-auto rounded bg-gray-900">
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onRun && (
          <button
            onClick={handleRun}
            className="p-1.5 rounded bg-gray-700/80 hover:bg-gray-600"
            title="Run query"
            disabled={running}
          >
            {running ? (
              <span className="w-3.5 h-3.5 block animate-spin border border-gray-300 border-t-transparent rounded-full" />
            ) : (
              <Play className="w-3.5 h-3.5 text-green-400" />
            )}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 rounded bg-gray-700/80 hover:bg-gray-600"
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-300" />}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark as Record<string, React.CSSProperties>}
        language={prismLanguage}
        PreTag="div"
        className="text-xs"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

function createCodeRenderer(onRunQuery?: (code: string) => void) {
  return function CodeRenderer({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock = match !== null || String(children ?? '').includes('\n')
    return isBlock ? (
      <CodeBlock language={match?.[1] ?? 'datalog'} onRun={onRunQuery}>{children}</CodeBlock>
    ) : (
      <code className="bg-gray-700 px-1 py-0.5 rounded text-xs" {...props}>
        {children}
      </code>
    )
  }
}

function buildIntroPrompt(
  introContext: { lessonTitle?: string; lessonGoals?: string; currentStep?: string; completedOpenStep?: { instruction: string; code: string } } | undefined,
  isFirstConversationMessage: boolean
): string {
  if (introContext?.completedOpenStep) {
    const { instruction, code } = introContext.completedOpenStep
    if (introContext.currentStep) {
      return `The user just finished the open-ended step below and ran this code. In 1-2 sentences, briefly acknowledge what they built. Then in 1-2 sentences, introduce the next step. Do not re-introduce yourself or greet them again.\n\nCompleted step: ${instruction}\n\nTheir code:\n\`\`\`datalog\n${code}\n\`\`\`\n\nNext task: ${introContext.currentStep}`
    }
    return `The user just finished the final open-ended step below and ran this code. In 2-3 sentences, acknowledge what they built and congratulate them on completing the lesson. Do not re-introduce yourself.\n\nCompleted step: ${instruction}\n\nTheir code:\n\`\`\`datalog\n${code}\n\`\`\``
  }
  if (introContext?.lessonTitle) {
    const goalsLine = introContext.lessonGoals ? ` It covers: ${introContext.lessonGoals}.` : ''
    const stepLine = introContext.currentStep ? `\n\nThe user's current task is:\n${introContext.currentStep}` : ''
    if (isFirstConversationMessage) {
      return `The user is starting the lesson "${introContext.lessonTitle}".${goalsLine}${stepLine}\n\nIn 2-3 sentences, introduce yourself once, describe what they will learn, and guide them through the current task.`
    }
    return `The user is continuing the lesson "${introContext.lessonTitle}".${goalsLine}${stepLine}\n\nIn 1-2 sentences, guide them through the current task. Do not re-introduce yourself, greet them again, or repeat a generic tutor opening.`
  }
  if (isFirstConversationMessage) {
    return 'In 2-3 sentences, introduce yourself as a friendly Minigraf tutor. Briefly mention that Minigraf supports Datalog querying and bi-temporal time travel, and invite the user to ask questions or start experimenting.'
  }
  return 'In 1-2 sentences, continue helping the user in the sandbox. Do not re-introduce yourself, greet them again, or repeat a generic tutor opening.'
}

import { AnonCapBanner } from './AnonCapBanner'
import { setChatHistory, clearChatHistory, getApiKey } from '@/lib/storage'
import type { ChatMessage as StoredChatMessage, Provider } from '@/lib/types'

interface ChatPanelProps {
  chatKey: string
  provider: string
  model: string
  systemPrompt: string
  tutorPayload?: string | null
  introContext?: { lessonTitle?: string; lessonGoals?: string; currentStep?: string; completedOpenStep?: { instruction: string; code: string } }
  introEnabled?: boolean
  introTrigger?: string | number
  onOpenSettings: () => void
  onRunQuery?: (code: string) => void
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
    case 'xai':
    case 'groq': return { 'Authorization': `Bearer ${apiKey}` }
    case 'gemini': return {}
    default: return {}
  }
}

function getProviderBody(provider: string, messages: { role: string; content: string }[], model: string): Record<string, unknown> {
  const base = { model, messages, max_tokens: 64 }
  switch (provider) {
    case 'anthropic':
    case 'openai':
    case 'xai':
    case 'groq': return base
    case 'gemini': return { contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }
    default: return base
  }
}

export function ChatPanel({
  chatKey,
  provider,
  model,
  systemPrompt,
  tutorPayload,
  introContext,
  introEnabled,
  introTrigger,
  onOpenSettings,
  onRunQuery,
}: ChatPanelProps) {
  const [showAnonBanner, setShowAnonBanner] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<StoredChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastIntroTokenRef = useRef<Set<string>>(new Set())
  const conversationStartedRef = useRef<Set<string>>(new Set())
  const prevChatKeyRef = useRef<string | null>(null)

  const codeRenderer = useMemo(() => createCodeRenderer(onRunQuery), [onRunQuery])

  type LLMMessage = { role: 'user' | 'assistant' | 'system'; content: string }

  const callLLM = useCallback(async (allMessages: LLMMessage[]) => {
    setLoading(true)
    abortRef.current = new AbortController()

    try {
      const userKey = await getApiKey(provider as Provider)

      // Can't call Anthropic directly from browser - need proxy
      // If no userKey for Anthropic, we can't proceed
      if (provider === 'anthropic' && !userKey) {
        throw new Error('No Anthropic API key found. Please add your key in Settings.')
      }

      // Direct call if: has key AND provider is NOT anthropic (so direct calls work for groq/gemini/openai/xai with keys)
      // For groq with no key, falls through to proxy for anonymous fallback
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
  }, [provider, model, setShowAnonBanner])

  // Keep a ref so the history-load effect can call the latest callLLM without a dep
  const callLLMRef = useRef(callLLM)
  useEffect(() => { callLLMRef.current = callLLM }, [callLLM])

  useEffect(() => {
    let cancelled = false

    async function maybeIntroduce() {
      const introToken = `${chatKey}:${introTrigger ?? 0}`
      const isNewConversation = prevChatKeyRef.current !== chatKey
      prevChatKeyRef.current = chatKey

      if (isNewConversation) {
        setMessages([])
        await clearChatHistory(chatKey)
      }

      if (cancelled || !introEnabled || lastIntroTokenRef.current.has(introToken)) {
        return
      }

      const isFirstConversationMessage = !conversationStartedRef.current.has(chatKey)
      conversationStartedRef.current.add(chatKey)
      lastIntroTokenRef.current.add(introToken)
      const prompt = buildIntroPrompt(introContext, isFirstConversationMessage)
      const introMsgs: LLMMessage[] = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ]
      await callLLMRef.current(introMsgs)
    }

    maybeIntroduce()

    return () => {
      cancelled = true
    }
  }, [chatKey, introContext, introEnabled, introTrigger, systemPrompt])

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

  const formatInput = (text: string): string => {
    let formatted = text
    formatted = formatted.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
      return code.includes('\n') ? `\`\`\`datalog\n${code}\`\`\`` : `\`${code.trim()}\``
    })
    return formatted
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rawInput = input.trim()
    if (!rawInput || loading) return

    const userInput = formatInput(rawInput)
    setInput('')

    const userMsg: StoredChatMessage = { role: 'user', content: userInput, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])

    const allMessages: LLMMessage[] = []

    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt })
    }

    allMessages.push(
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    )

    if (tutorPayload) {
      allMessages.push({
        role: 'user',
        content: `Latest playground context:\n\n${tutorPayload}`,
      })
    }

    allMessages.push({ role: 'user', content: userInput })

    await callLLM(allMessages)
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
                <div className="prose prose-invert prose-sm text-gray-100">
                  <ReactMarkdown
                    components={{ code: codeRenderer }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-white text-sm whitespace-pre-wrap">
                  <ReactMarkdown components={{ code: codeRenderer }}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant' || messages[messages.length - 1].content === '') && (
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
          <textarea
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Ask about the graph... (Shift+Enter for new line)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            disabled={loading}
          />
          {loading ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-medium transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
