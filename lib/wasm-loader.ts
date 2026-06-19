import init, { BrowserDb } from '@minigraf/browser'

let wasmInit: Promise<unknown> | null = null

export async function loadMinigraf(dbName: string) {
  if (!wasmInit) {
    wasmInit = init()
  }
  await wasmInit
  return BrowserDb.open(dbName)
}
