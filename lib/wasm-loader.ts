import init, { BrowserDb } from '@minigraf/browser'

export async function loadMinigraf() {
  await init()
  return BrowserDb.open('minigraf')
}
