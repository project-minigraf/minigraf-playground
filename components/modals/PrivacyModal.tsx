'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'privacy-accepted'

export function PrivacyModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl p-6 space-y-4 text-sm text-gray-300">
        <h2 className="text-lg font-semibold text-white">Before you start</h2>
        <p>
          <strong className="text-white">Your API keys stay in your browser.</strong>{' '}
          They are stored in IndexedDB and are never sent to our servers.
        </p>
        <p>
          When you use AI features, your queries and chat messages are sent to the
          third-party LLM provider you choose (e.g. Anthropic, OpenAI, Google, xAI,
          or Groq). Each provider processes this data under their own privacy policy.
        </p>
        <p>
          By continuing you acknowledge this. Read our{' '}
          <a href="/terms" className="text-blue-400 underline" target="_blank">
            Terms &amp; Conditions
          </a>{' '}
          for full details.
        </p>
        <button
          onClick={accept}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium transition-colors"
        >
          I understand — let me in
        </button>
      </div>
    </div>
  )
}