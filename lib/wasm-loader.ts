// WASM loader - simple version following browser example
export async function loadMinigraf() {
  // Use dynamic import with full URL - browser will resolve it as ES module
  // The key is letting the browser handle the import, not Turbopack
  const moduleUrl = '/wasm/pkg/minigraf.js'
  
  // Dynamic import - will be handled by browser as ES module
  const wasm = await import(/* @vite-ignore */ moduleUrl) as {
    default: () => Promise<void>
    BrowserDb: {
      open: (name: string) => Promise<{
        execute: (q: string) => Promise<string>
        free: () => void
      }>
    }
  }
  
  // Initialize WASM
  await wasm.default()
  
  // Get database
  return wasm.BrowserDb.open('minigraf')
}