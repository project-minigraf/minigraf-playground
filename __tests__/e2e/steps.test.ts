/**
 * @jest-environment node
 */
import { readFileSync } from 'fs'
import path from 'path'
import { initSync, BrowserDb } from '@minigraf/browser'
import { splitForms } from '@/lib/minigraf-execution'
import { TUTORIALS } from '@/lib/lessons'

// Init WASM once for the whole suite
const wasmPath = path.resolve('node_modules/@minigraf/browser/minigraf_wasm_bg.wasm')
initSync({ module: readFileSync(wasmPath) })

// Helper: strip single-line Datalog comments (`;` to end of line)
// so that parentheses inside comments are not parsed as forms.
function stripComments(src: string): string {
  return src
    .split('\n')
    .map(line => {
      const idx = line.indexOf(';')
      return idx === -1 ? line : line.slice(0, idx)
    })
    .join('\n')
}

// Helper: run a step's starterCode in a fresh in-memory db, return last query result
async function runStep(starterCode: string) {
  const db = BrowserDb.openInMemory()
  const forms = splitForms(stripComments(starterCode))
  let lastQueryResult: { columns: string[]; rows: string[][] } | null = null
  for (const form of forms) {
    const raw = await db.execute(form)
    const parsed = JSON.parse(raw) as {
      variables?: string[]
      results?: unknown[][]
      transacted?: number
      retracted?: number
      ok?: boolean
    }
    if (Array.isArray(parsed.variables) || Array.isArray(parsed.results)) {
      lastQueryResult = {
        columns: parsed.variables ?? [],
        rows: (parsed.results ?? []).map((row: unknown[]) => row.map(String)),
      }
    }
  }
  return lastQueryResult
}

// Helper: set-based row comparison
function rowsMatch(actual: string[][], expected: string[][]): boolean {
  if (actual.length !== expected.length) return false
  const toKey = (r: string[]) => r.join('\x00')
  const actualKeys = new Set(actual.map(toKey))
  return expected.every(r => actualKeys.has(toKey(r)))
}

// Generate tests for each tutorial
for (const tutorial of TUTORIALS) {
  describe(`${tutorial.title} — step validation`, () => {
    for (const lesson of tutorial.lessons) {
      describe(lesson.title, () => {
        for (const step of lesson.steps) {
          // Skip steps with no expectedResult (open-ended steps)
          if (!step.expectedResult) continue
          // Skip mutation/rule-only steps that have no query result to validate
          if (step.expectedResult.columns.length === 0 && step.expectedResult.rows.length === 0) continue
          const expected = step.expectedResult
          it(`${step.id}: columns and rows match expected`, async () => {
            const result = await runStep(step.starterCode)
            expect(result).not.toBeNull()
            expect(result!.columns).toEqual(expected.columns)
            expect(rowsMatch(result!.rows, expected.rows)).toBe(true)
          }, 15000) // 15s timeout per step (WASM cold start)
        }
      })
    }
  })
}
