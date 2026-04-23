import type { QueryResult } from '@/lib/types'

type RawExecutionResult = {
  error?: string
  variables?: string[]
  results?: string[][]
  transacted?: number
  retracted?: number
  ok?: boolean
}

export function splitForms(src: string): string[] {
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

function parseRawExecutionResult(raw: string): RawExecutionResult {
  let parsed: RawExecutionResult

  try {
    parsed = JSON.parse(raw) as RawExecutionResult
  } catch {
    throw new Error(raw)
  }

  if (parsed.error) {
    throw new Error(parsed.error)
  }

  return parsed
}

export function normalizeExecutionResults(rawResults: string[], executionTimeMs: number): QueryResult {
  let lastQueryResult: Pick<QueryResult, 'columns' | 'rows'> | null = null
  let sawMutation = false
  let sawRule = false

  for (const raw of rawResults) {
    const parsed = parseRawExecutionResult(raw)

    if (Array.isArray(parsed.variables) || Array.isArray(parsed.results)) {
      lastQueryResult = {
        columns: parsed.variables ?? [],
        rows: parsed.results ?? [],
      }
      continue
    }

    if (typeof parsed.transacted === 'number' || typeof parsed.retracted === 'number') {
      sawMutation = true
      continue
    }

    if (parsed.ok) {
      sawRule = true
    }
  }

  if (lastQueryResult) {
    return {
      kind: 'query',
      columns: lastQueryResult.columns,
      rows: lastQueryResult.rows,
      executionTimeMs,
    }
  }

  if (sawMutation) {
    return {
      kind: 'mutation',
      columns: [],
      rows: [],
      executionTimeMs,
    }
  }

  if (sawRule) {
    return {
      kind: 'rule',
      columns: [],
      rows: [],
      executionTimeMs,
    }
  }

  return {
    kind: 'empty',
    columns: [],
    rows: [],
    executionTimeMs,
  }
}
