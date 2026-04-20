'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'
import { loadMinigraf } from '@/lib/wasm-loader'

type Status = 'loading' | 'ready' | 'error'

function splitForms(src: string): string[] {
  const forms: string[] = []
  let depth = 0
  let start = -1
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '(') {
      if (depth === 0) start = i
      depth++
    } else if (ch === ')') {
      depth--
      if (depth === 0 && start !== -1) {
        forms.push(src.slice(start, i + 1))
        start = -1
      }
    }
  }
  return forms
}

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
    if (forms.length === 0) throw new Error('No statements to execute')
    let parsed: Record<string, unknown> = {}
    for (const form of forms) {
      const raw = await inst.execute(form)
      parsed = JSON.parse(raw)
    }
    return {
      columns: (parsed.variables as string[]) ?? [],
      rows: (parsed.results as unknown[][]) ?? [],
      executionTimeMs: 0,
    }
  }

  return { status, error, query }
}