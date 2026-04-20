import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

declare const globalThis: { structuredClone?: (obj: unknown) => unknown } & Record<string, unknown>

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj))
}