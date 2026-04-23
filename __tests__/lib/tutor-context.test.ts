import { buildTutorContext, buildNarratePayload } from '@/lib/tutor'
import type { LessonStep } from '@/lib/types'

const lessonStep: LessonStep = {
  id: 'step-1',
  instruction: 'Find all of Alice\'s friends.',
  starterCode: '',
  expectedResult: {
    columns: ['?friend'],
    rows: [['bob'], ['carol']],
  },
  hints: [],
  successMessage: 'Correct.',
}

describe('buildTutorContext', () => {
  it('computes a diff for lesson query results', () => {
    const context = buildTutorContext({
      query: '(query [:find ?friend :where [:alice :friend ?friend]])',
      result: {
        kind: 'query',
        columns: ['?friend'],
        rows: [['bob']],
        executionTimeMs: 1,
      },
      error: null,
      lessonStep,
      conversationHistory: [],
    })

    expect(context.diff).toEqual({
      missing: [['carol']],
      unexpected: [],
    })
  })

  it('does not compute a diff for mutation-only runs', () => {
    const context = buildTutorContext({
      query: '(transact [[:alice :friend :bob]])',
      result: {
        kind: 'mutation',
        columns: [],
        rows: [],
        executionTimeMs: 1,
      },
      error: null,
      lessonStep,
      conversationHistory: [],
    })

    expect(context.diff).toBeNull()
    expect(buildNarratePayload(context)).toContain('Mutation succeeded')
  })

  it('preserves execution errors for tutor feedback', () => {
    const context = buildTutorContext({
      query: '(query [:find ?friend :where [:alice :friend ?friend])',
      result: null,
      error: 'parse error',
      lessonStep,
      conversationHistory: [],
    })

    expect(context.queryError).toBe('parse error')
    expect(buildNarratePayload(context)).toContain('parse error')
  })
})
