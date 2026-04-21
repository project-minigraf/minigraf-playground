import type { QueryResult, TutorDiff, LessonStep, ChatMessage } from './types'

export type TutorContext = {
  query: string
  queryResult: QueryResult | null
  queryError: string | null
  diff: TutorDiff | null
  lessonStep: LessonStep | null
  conversationHistory: ChatMessage[]
}

export function computeDiff(
  actual: { columns: string[]; rows: string[][] },
  expected: { columns: string[]; rows: string[][] }
): TutorDiff {
  const toKey = (row: string[]) => row.join('\x00')
  const actualSet = new Set(actual.rows.map(toKey))
  const expectedSet = new Set(expected.rows.map(toKey))
  return {
    missing: expected.rows.filter((r) => !actualSet.has(toKey(r))),
    unexpected: actual.rows.filter((r) => !expectedSet.has(toKey(r))),
  }
}

export function buildNarratePayload(ctx: TutorContext): string {
  const parts: string[] = []
  if (ctx.lessonStep) parts.push(`Current lesson step: ${ctx.lessonStep.instruction}`)
  parts.push(`User's query:\n\`\`\`datalog\n${ctx.query}\n\`\`\``)
  if (ctx.queryError) {
    parts.push(`Query error: ${ctx.queryError}`)
  } else if (ctx.diff) {
    const { missing, unexpected } = ctx.diff
    if (missing.length === 0 && unexpected.length === 0) {
      parts.push('Result matches expected output. The query is correct.')
    } else {
      if (missing.length > 0) parts.push(`Missing tuples (expected but not in result): ${missing.map((r) => `[${r.join(', ')}]`).join(', ')}`)
      if (unexpected.length > 0) parts.push(`Unexpected tuples (in result but not expected): ${unexpected.map((r) => `[${r.join(', ')}]`).join(', ')}`)
    }
  } else if (ctx.queryResult) {
    parts.push(`Query returned ${ctx.queryResult.rows.length} row(s). Provide contextual feedback.`)
  }
  return parts.join('\n\n')
}
