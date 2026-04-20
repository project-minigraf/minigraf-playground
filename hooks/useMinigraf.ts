'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'

type Status = 'loading' | 'ready' | 'error'

let instancePromise: Promise<unknown> | null = null

// Load WASM using fetch + WebAssembly for better Turbopack compatibility
async function loadWasm() {
  if (typeof window === 'undefined') {
    throw new Error('WASM can only be loaded in browser')
  }
  
  // Fetch the JS file as text then eval it
  const response = await fetch('/wasm/pkg/minigraf.js')
  const jsCode = await response.text()
  
  // Create a module from the code
  // eslint-disable-next-line no-new-func
  const moduleFn = new Function('exports', jsCode + '\nreturn exports')
  const exports: { default: () => Promise<void>; BrowserDb: { open: (name: string) => Promise<unknown> } } = moduleFn({})
  
  await exports.default()
  return exports.BrowserDb.open('minigraf')
}

function getOrCreateInstance() {
  if (!instancePromise) {
    instancePromise = loadWasm()
  }
  return instancePromise
}

export function useMinigraf() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<unknown>(null)

  useEffect(() => {
    getOrCreateInstance()
      .then((inst) => { instanceRef.current = inst; setStatus('ready') })
      .catch((err) => { setError(String(err)); setStatus('error') })
  }, [])

  async function query(datalog: string): Promise<QueryResult> {
    if (!instanceRef.current) throw new Error('Minigraf not ready')
    const inst = instanceRef.current as { execute: (q: string) => Promise<string> }
    const raw = await inst.execute(datalog)
    const parsed = JSON.parse(raw)
    return {
      columns: parsed.variables ?? [],
      rows: parsed.results ?? [],
      executionTimeMs: 0,
    }
  }

  return { status, error, query }
}