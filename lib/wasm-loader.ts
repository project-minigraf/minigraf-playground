// WASM loader - runs only in browser
export async function loadMinigraf() {
  // Fetch the JS code
  const jsRes = await fetch('/wasm/pkg/minigraf.js')
  const jsCode = await jsRes.text()
  
  // Patch fetch to serve the WASM URL correctly
  const originalFetch = window.fetch
  
  window.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (url.includes('minigraf')) {
      const res = await originalFetch(input as RequestInfo | URL)
      const contentType = url.endsWith('.wasm') ? 'application/wasm' : 'application/javascript'
      return new Response(res.body, {
        headers: { 'Content-Type': contentType }
      })
    }
    return originalFetch(input as RequestInfo | URL)
  }
  
  try {
    // We need an ES module environment
    // Create a blob with the JS as a module
    const jsBlob = new Blob([jsCode], { type: 'application/javascript' })
    const jsUrl = URL.createObjectURL(jsBlob)
    
    // Dynamic import treats it as ES module
    const ns = await import(jsUrl) as {
      default: () => Promise<void>
      BrowserDb: {
        open: (name: string) => Promise<{
          execute: (q: string) => Promise<string>
          free: () => void
        }>
      }
    }
    
    // Call init if needed
    if (ns.default) {
      await ns.default()
    }
    
    // Get BrowserDb from module namespace
    if (!ns.BrowserDb) {
      throw new Error('BrowserDb not exported from module')
    }
    
    return ns.BrowserDb.open('minigraf')
  } finally {
    window.fetch = originalFetch
  }
}