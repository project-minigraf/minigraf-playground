'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'
import { loadMinigraf } from '@/lib/wasm-loader'

type Status = 'loading' | 'ready' | 'error'

let instancePromise: Promise<unknown> | null = null

function getOrCreateInstance() {
  if (!instancePromise) {
    instancePromise = loadMinigraf()
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