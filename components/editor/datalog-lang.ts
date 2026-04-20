import { StreamLanguage } from '@codemirror/language'

export const datalogLanguage = StreamLanguage.define({
  token(stream) {
if (stream.match(/^\?[a-zA-Z_][a-zA-Z0-9_]*/)) return 'variableName'
    if (stream.match(/^:-/)) return 'keyword'
    if (stream.match(/^\?-/)) return 'keyword'
    if (stream.match(/^[a-z][a-zA-Z0-9_]*/)) return 'atom'
    stream.next()
    return null
  },
})