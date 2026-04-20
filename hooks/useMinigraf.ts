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
    
    // If no forms found, check if there's any non-empty content
    const trimmed = datalog.trim()
    if (!trimmed) {
      throw new Error('No statements to execute')
    }
    
    // Try parsing each form individually to get all results
    const allRows: string[][] = []
    const allVars: string[] = []
    
    for (const form of forms) {
      const raw = await inst.execute(form)
      
      // Try to parse and check for errors
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(raw)
      } catch {
        // If we can't parse the response at all, it's likely an error string
        throw new Error(raw)
      }
      
      // Check for error fields (different WASM error formats)
      if ('error' in parsed) {
        throw new Error(String(parsed.error))
      }
      
      // Get variables and results from this form
      const vars = (parsed.variables as string[]) ?? []
      const rows = (parsed.results as string[][]) ?? []
      
      // Check for ok: true which means a transact/retract was successful
      if ('ok' in parsed) {
        // This was a mutating operation, not a query
        continue
      }
      
      // Check for executed queries
      if (vars.length > 0) {
        allVars.push(...vars)
        allRows.push(...rows)
      }
    }
    
    // If we got here but no vars/rows from queries, check if any forms would have worked
    if (allRows.length === 0 && forms.length > 0) {
      // Check if the forms had any query results - if empty, that's actually fine
    }

    // If forms is empty but input has content, there's a syntax error (unmatched parens)
    if (forms.length === 0 && trimmed.length > 0) {
      throw new Error('Syntax error: unmatched parentheses or incomplete expression')
    }
    
    return {
      columns: allVars,
      rows: allRows,
      executionTimeMs: 0,
    }
  }

  return { status, error, query }
}