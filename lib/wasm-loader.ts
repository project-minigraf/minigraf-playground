import init, { BrowserDb } from '@minigraf/browser'

export async function loadMinigraf(dbName: string) {
  await init()
  return BrowserDb.open(dbName)
}
