import { VISUALIZER_URL, visualizerScript, visualizerUrl } from '@/lib/visualizer'

function decodeData(url: string): string {
  const params = new URLSearchParams(url.split('#')[1])
  const b64 = (params.get('data') ?? '').replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return decodeURIComponent(Array.from(bin, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))
}

describe('visualizerScript', () => {
  it('keeps transact, retract and rule forms and drops queries', () => {
    const src = `(transact [[:a :name "A"]])
(query [:find ?n :where [?e :name ?n]])
(retract [[:a :name "A"]])
(rule [(r ?x) [?x :name _]])`
    expect(visualizerScript(src)).toBe(
      '(transact [[:a :name "A"]])\n(retract [[:a :name "A"]])\n(rule [(r ?x) [?x :name _]])',
    )
  })

  it('ignores parentheses in comments and strings', () => {
    const src = `; Matches (a draw has no winner)
(transact [[:m1 :match/note "tied (1-1)"]]) ; trailing (comment)`
    expect(visualizerScript(src)).toBe('(transact [[:m1 :match/note "tied (1-1)"]])')
  })

  it('returns null when there is nothing to visualize', () => {
    expect(visualizerScript('(query [:find ?x :where [?x :a _]])')).toBeNull()
    expect(visualizerScript('')).toBeNull()
  })
})

describe('visualizerUrl', () => {
  it('links to the visualizer with the script in the hash', () => {
    const url = visualizerUrl('(transact [[:café :name "Zoë"]])', 'Sports League')
    expect(url?.startsWith(`${VISUALIZER_URL}#data=`)).toBe(true)
    expect(url).toContain('title=Sports+League')
    expect(decodeData(url ?? '')).toBe('(transact [[:café :name "Zoë"]])')
    expect(new URLSearchParams(url?.split('#')[1]).get('data')).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('returns null when the code has no writes', () => {
    expect(visualizerUrl('(query [:find ?x :where [?x :a _]])', 'x')).toBeNull()
  })
})
