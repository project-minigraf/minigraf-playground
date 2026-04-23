import { normalizeExecutionResults } from '@/lib/minigraf-execution'

describe('normalizeExecutionResults', () => {
  it('treats transact output as a mutation with no result rows', () => {
    expect(
      normalizeExecutionResults(['{"transacted":1}'], 5)
    ).toEqual({
      kind: 'mutation',
      columns: [],
      rows: [],
      executionTimeMs: 5,
    })
  })

  it('returns the last query result when a run mixes mutations and queries', () => {
    expect(
      normalizeExecutionResults(
        [
          '{"transacted":1}',
          '{"variables":["?friend"],"results":[["bob"],["carol"]]}',
        ],
        9
      )
    ).toEqual({
      kind: 'query',
      columns: ['?friend'],
      rows: [['bob'], ['carol']],
      executionTimeMs: 9,
    })
  })

  it('throws Minigraf execution errors instead of returning malformed results', () => {
    expect(() =>
      normalizeExecutionResults(['{"error":"parse error"}'], 2)
    ).toThrow('parse error')
  })
})
