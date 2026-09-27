// Links to the Minigraf time travel visualizer
// (https://github.com/project-minigraf/minigraf-visualizer).
// The visualizer reads a Datalog script from the URL hash, so nothing is sent
// to a server: the hash never leaves the browser.

export const VISUALIZER_URL = 'https://project-minigraf.github.io/minigraf-visualizer/'

const WRITE_FORMS = new Set(['transact', 'retract', 'rule'])

/** Top-level `( ... )` forms, skipping `;` comments and parentheses inside strings. */
function topLevelForms(src: string): string[] {
  const forms: string[] = []
  let depth = 0
  let start = -1
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === ';') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (ch === '"') {
      i++
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') i++
        i++
      }
      continue
    }
    if (ch === '(') {
      if (depth === 0) start = i
      depth++
    } else if (ch === ')' && depth > 0) {
      depth--
      if (depth === 0) forms.push(src.slice(start, i + 1))
    }
  }
  return forms
}

/**
 * The part of the editor code the visualizer can show: the `transact`,
 * `retract` and `rule` forms, in order. Queries are dropped. Returns null when
 * there are no writes.
 */
export function visualizerScript(src: string): string | null {
  const writes = topLevelForms(src).filter((f) => {
    const m = /^\(\s*([a-z-]+)/.exec(f)
    return m !== null && WRITE_FORMS.has(m[1])
  })
  if (!writes.some((f) => !/^\(\s*rule\b/.test(f))) return null
  return writes.join('\n')
}

/** Base64url of the UTF-8 bytes of `text` (no padding), as the visualizer expects. */
function base64Url(text: string): string {
  // encodeURIComponent yields UTF-8 as %XX escapes; turn them back into bytes.
  const bin = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** A visualizer link that replays the writes in `src`, or null if there are none. */
export function visualizerUrl(src: string, title: string): string | null {
  const script = visualizerScript(src)
  if (script === null) return null
  const params = new URLSearchParams({ data: base64Url(script), title })
  return `${VISUALIZER_URL}#${params.toString()}`
}
