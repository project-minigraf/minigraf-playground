import { computeDiff, buildNarratePayload } from '@/lib/tutor'

describe('computeDiff', () => {
  it('detects missing tuples', () => {
    const actual = { columns: ['?x'], rows: [['bob']] }
    const expected = { columns: ['?x'], rows: [['bob'], ['carol']] }
    const d = computeDiff(actual, expected)
    expect(d.missing).toEqual([['carol']])
    expect(d.unexpected).toEqual([])
  })
  it('detects unexpected tuples', () => {
    const actual = { columns: ['?x'], rows: [['bob'], ['dave']] }
    const expected = { columns: ['?x'], rows: [['bob']] }
    const d = computeDiff(actual, expected)
    expect(d.missing).toEqual([])
    expect(d.unexpected).toEqual([['dave']])
  })
  it('returns empty diff when results match', () => {
    const r = { columns: ['?x'], rows: [['bob']] }
    expect(computeDiff(r, r)).toEqual({ missing: [], unexpected: [] })
  })
})

describe('buildNarratePayload', () => {
  it('includes diff when present', () => {
    const payload = buildNarratePayload({
      query: '?- friend(alice, ?x).',
      queryResult: { columns: ['?x'], rows: [['bob']], executionTimeMs: 1 },
      queryError: null,
      diff: { missing: [['carol']], unexpected: [] },
      lessonStep: null,
      conversationHistory: [],
    })
    expect(payload).toContain('carol')
    expect(payload).toContain('Missing')
  })
  it('includes error when query failed', () => {
    const payload = buildNarratePayload({
      query: '?- bad syntax',
      queryResult: null,
      queryError: 'parse error at line 1',
      diff: null,
      lessonStep: null,
      conversationHistory: [],
    })
    expect(payload).toContain('parse error')
  })
})
