// WASM loader - runs only in browser
export async function loadMinigraf() {
  // First fetch the WASM binary 
  const wasmRes = await fetch('/wasm/pkg/minigraf_bg.wasm')
  const wasmBuffer = await wasmRes.arrayBuffer()
  
  // Override fetch to serve cached WASM
  const originalFetch = window.fetch
  const wasmCache = new Map([['/wasm/pkg/minigraf_bg.wasm', wasmBuffer]])
  
  window.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (wasmCache.has(url)) {
      return new Response(wasmCache.get(url), {
        headers: { 'Content-Type': 'application/wasm' }
      })
    }
    return originalFetch(input)
  }
  
  try {
    // Create script element to load the JS (runs in global scope with exports)
    const script = document.createElement('script')
    script.src = '/wasm/pkg/minigraf.js'
    
    // Wait for script to load using promise
    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    
    // After script runs, it should have set up BrowserDb on window
    const BrowserDb = (window as any).BrowserDb as {
      open: (name: string) => Promise<{
        execute: (q: string) => Promise<string>
        free: () => void
      }>
    }
    
    if (!BrowserDb) {
      throw new Error('BrowserDb not found after loading script')
    }
    
    return BrowserDb.open('minigraf')
  } finally {
    window.fetch = originalFetch
  }
}