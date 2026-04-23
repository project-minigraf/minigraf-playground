'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'
import { loadMinigraf } from '@/lib/wasm-loader'
import { normalizeExecutionResults, splitForms } from '@/lib/minigraf-execution'

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
    const forms = splitForms(datalog)
    const trimmed = datalog.trim()
    if (!trimmed) {
      throw new Error('No statements to execute')
    }

    const startTime = performance.now()
    const rawResults: string[] = []

    for (const form of forms) {
      rawResults.push(await inst.execute(form))
    }

    if (forms.length === 0 && trimmed.length > 0) {
      throw new Error('Syntax error: unmatched parentheses or incomplete expression')
    }

    return normalizeExecutionResults(
      rawResults,
      Math.round(performance.now() - startTime)
    )
  }

  return { status, error, query }
}
