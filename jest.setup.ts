import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

declare const globalThis: { structuredClone?: (obj: unknown) => unknown; fetch?: unknown } & Record<string, unknown>

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj))
}

// Define fetch if it doesn't exist (for spyOn compatibility in tests)
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) })
}