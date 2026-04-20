'use client'
import { useEffect, useRef, useState } from 'react'
import type { QueryResult } from '@/lib/types'

type Status = 'loading' | 'ready' | 'error'

let instancePromise: Promise<unknown> | null = null

async function loadWasm() {
  if (typeof window === 'undefined') {
    throw new Error('WASM can only be loaded in browser')
  }
  
  // Fetch WASM binary directly
  const wasmRes = await fetch('/api/wasm/minigraf_bg.wasm')
  const wasmBuffer = await wasmRes.arrayBuffer()
  
  // Create minimal imports object for WASM
  const importObject = {
    './minigraf_bg.js': {}
  }
  
  // Instantiate WASM module
  const wasmModule = new WebAssembly.Module(wasmBuffer)
  const wasmInstance = new WebAssembly.Instance(wasmModule, importObject)
  
  // Get exports
  const exports = wasmInstance.exports as Record<string, unknown>
  
  // Return wrapper with execute method
  return {
    execute: async (query: string): Promise<string> => {
      const encoder = new TextEncoder()
      const queryBytes = encoder.encode(query + '\0')
      
      // Allocate query in WASM memory
      const queryPtr = (exports.memory_alloc as (len: number) => number)(queryBytes.length)
      
      // Write query to WASM memory
      const memory = exports.memory as WebAssembly.Memory
      const view = new Uint8Array(memory.buffer)
      view.set(queryBytes, queryPtr)
      
      // Call execute
      const resultPtr = (exports.browserdb_execute as (ptr: number, len: number, txId: number) => number)(
        queryPtr, queryBytes.length, 0
      )
      
      // Read result from WASM memory
      let len = 0
      let start = resultPtr
      while (view[start + len] !== 0) len++
      
      const resultBytes = new Uint8Array(memory.buffer, resultPtr, len)
      return new TextDecoder().decode(resultBytes)
    },
    free: () => {
      // Cleanup if needed
    }
  }
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