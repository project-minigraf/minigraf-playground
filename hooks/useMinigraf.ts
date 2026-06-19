'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'
import { loadMinigraf } from '@/lib/wasm-loader'
import { normalizeExecutionResults, splitForms } from '@/lib/minigraf-execution'

type Status = 'loading' | 'ready' | 'error'

export const MAX_CACHED_INSTANCES = 2

const instanceCache = new Map<string, { promise: Promise<unknown>; lastUsed: number }>()

/** Exported for testing only — clears the module-level LRU cache. */
export function _clearInstanceCache() {
  instanceCache.clear()
}

function evictLRUIfNeeded() {
  if (instanceCache.size < MAX_CACHED_INSTANCES) return
  let lruKey = ''
  let lruTime = Infinity
  for (const [key, entry] of instanceCache) {
    if (entry.lastUsed < lruTime) {
      lruTime = entry.lastUsed
      lruKey = key
    }
  }
  if (lruKey) {
    instanceCache.get(lruKey)!.promise.then((inst) =>
      (inst as { close?: () => void }).close?.()
    )
    instanceCache.delete(lruKey)
  }
}

function getOrCreateInstance(tutorialId: string): Promise<unknown> {
  if (instanceCache.has(tutorialId)) {
    instanceCache.get(tutorialId)!.lastUsed = Date.now()
    return instanceCache.get(tutorialId)!.promise
  }
  evictLRUIfNeeded()
  const promise = loadMinigraf(`minigraf-${tutorialId}`)
  instanceCache.set(tutorialId, { promise, lastUsed: Date.now() })
  return promise
}

export function useMinigraf(tutorialId: string) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<unknown>(null)

  useEffect(() => {
    setStatus('loading')
    getOrCreateInstance(tutorialId)
      .then((inst) => {
        instanceRef.current = inst
        setStatus('ready')
      })
      .catch((err) => {
        setError(String(err))
        setStatus('error')
      })
  }, [tutorialId])

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
