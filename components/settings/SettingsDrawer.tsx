'use client'
import { useState, useEffect, useCallback } from 'react'
import { getSessionPrefs, setSessionPrefs, getApiKey, setApiKey, clearApiKey } from '@/lib/storage'
import type { Provider } from '@/lib/types'

const PROVIDERS: { id: Provider; name: string }[] = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'xai', name: 'xAI Grok' },
]

const MODELS: Record<Provider, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-6'],
  openai: ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1'],
  xai: ['grok-3-mini', 'grok-3'],
}

interface SettingsDrawerProps {
  onClose: () => void
}

export function SettingsDrawer({ onClose }: SettingsDrawerProps) {
  const [provider, setProvider] = useState<Provider>('gemini')
  const [model, setModel] = useState('')
  const [apiKey, setApiKeyState] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    getSessionPrefs().then((prefs) => {
      const p = prefs?.provider || 'gemini'
      setProvider(p)
      setModel(prefs?.model || MODELS[p][0])
      return getApiKey(p)
    }).then((key) => {
      setApiKeyState(key || '')
      setLoaded(true)
    })
  }, [])

  const handleProviderChange = useCallback((p: Provider) => {
    setProvider(p)
    setModel(MODELS[p][0])
    setTestStatus('idle')
    getApiKey(p).then((key) => {
      setApiKeyState(key || '')
    })
  }, [])

  const handleTestConnection = useCallback(async () => {
    if (!apiKey) return
    setTestStatus('testing')
    try {
      // Call provider directly from browser - never send key to /api/chat
      // Use a simple endpoint to verify the key works
      let res: Response
      switch (provider) {
        case 'anthropic':
          // Use GET /v1/models to verify key without CORS issues
          res = await fetch('https://api.anthropic.com/v1/models', {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          })
          break
        case 'openai':
          res = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          })
          break
        case 'gemini':
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          break
        case 'xai':
          res = await fetch('https://api.x.ai/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          })
          break
        default:
          res = new Response(null, { status: 400 })
      }
      setTestStatus(res.ok ? 'success' : 'failed')
    } catch {
      setTestStatus('failed')
    }
  }, [apiKey, provider])

  const handleClear = useCallback(async () => {
    await clearApiKey(provider)
    setApiKeyState('')
    setTestStatus('idle')
  }, [provider])

  const handleSave = useCallback(async () => {
    if (apiKey) {
      await setApiKey(provider, apiKey)
    }
    await setSessionPrefs({ provider, model, mode: undefined })
    onClose()
  }, [provider, model, apiKey, onClose])

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded text-blue-200 text-sm">
        Your API key is stored only in this browser and sent directly to {PROVIDERS.find(p => p.id === provider)?.name} to authenticate your requests. It never touches Minigraf's servers.
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as Provider)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
          >
            {MODELS[provider].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleTestConnection}
            disabled={!apiKey || testStatus === 'testing'}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded px-3 py-2 text-sm"
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleClear}
            disabled={!apiKey}
            className="bg-red-900/50 hover:bg-red-900 disabled:opacity-50 text-red-300 rounded px-3 py-2 text-sm"
          >
            Clear
          </button>
        </div>

        {testStatus === 'success' && <div className="text-green-400 text-sm">✓ Connected</div>}
        {testStatus === 'failed' && <div className="text-red-400 text-sm">✗ Failed</div>}

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 font-medium"
        >
          Save & Close
        </button>
      </div>
    </div>
  )
}