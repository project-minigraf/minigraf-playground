// WASM loader - runs only in browser
export async function loadMinigraf() {
  // This function only runs on client
  const _window = window as unknown as Record<string, unknown>
  
  // Fetch the JS wrapper
  const jsRes = await fetch('/wasm/pkg/minigraf.js')
  const jsCode = await jsRes.text()
  
  // Cache for WASM binary
  const wasmCache = new Map<string, ArrayBuffer>()
  
  // Override fetch temporarily
  const originalFetch = _window.fetch as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  _window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (url.includes('minigraf_bg.wasm')) {
      if (!wasmCache.has(url)) {
        const res = await originalFetch!(url)
        wasmCache.set(url, await res.arrayBuffer())
      }
      return new Response(wasmCache.get(url)!, {
        headers: { 'Content-Type': 'application/wasm' }
      })
    }
    return originalFetch!(input, init)
  }
  
  // Run JS - sets up wasm and BrowserDb globals
  // eslint-disable-next-line no-eval
  const initFn = eval(jsCode)
  
  if (typeof initFn === 'function') {
    await initFn()
  }
  
  // Restore fetch
  _window.fetch = originalFetch
  
  // Access globals
  const BrowserDb = _window.BrowserDb as {
    open: (name: string) => Promise<{
      execute: (q: string) => Promise<string>
      free: () => void
    }>
  }
  
  if (!BrowserDb) {
    throw new Error('BrowserDb not found')
  }
  
  return BrowserDb.open('minigraf')
}