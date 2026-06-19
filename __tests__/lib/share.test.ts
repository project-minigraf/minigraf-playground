import { encodeQuery, decodeQuery } from '@/lib/share'

describe('encodeQuery / decodeQuery', () => {
  it('round-trips a simple query string', () => {
    const original = '?- friend(alice, ?x).\nfriend(alice, bob).'
    expect(decodeQuery(encodeQuery(original))).toBe(original)
  })

  it('round-trips a multiline query with special characters', () => {
    const original = '(transact [[:alice :friend :bob]])\n(query [:find ?x :where [:alice :friend ?x]])'
    expect(decodeQuery(encodeQuery(original))).toBe(original)
  })

  it('returns null for invalid base64', () => {
    expect(decodeQuery('!!!invalid')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeQuery('')).toBeNull()
  })
})
