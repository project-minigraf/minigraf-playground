// WASM loader - manual instantiation without JS wrapper
export async function loadMinigraf() {
  // Fetch both files
  const [jsRes, wasmRes] = await Promise.all([
    fetch('/wasm/pkg/minigraf.js'),
    fetch('/wasm/pkg/minigraf_bg.wasm')
  ])
  
  // Parse JS to extract needed functions - we'll call JS functions manually
  const jsCode = await jsRes.text()
  const wasmBuffer = await wasmRes.arrayBuffer()
  
  // Parse WASM and instantiate with empty imports (JS will provide them)
  // We need the JS to have already run to set up the memory, so let's take a different approach:
  // Use a script element to load the JS (no module), then access the globals it creates
  
  // First, override fetch so the JS can load the WASM when it runs
  const fetchCache = new Map<string, Response>()
  const originalFetch = window.fetch
  
  window.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (url.includes('minigraf_bg.wasm')) {
      if (!fetchCache.has(url)) {
        fetchCache.set(url, new Response(wasmBuffer, { headers: { 'Content-Type': 'application/wasm' } }))
      }
      return fetchCache.get(url)!
    }
    return originalFetch(input as RequestInfo)
  }
  
  try {
    // Load JS as module to get exports - this should work since we cached the WASM
    const jsBlob = new Blob([jsCode], { type: 'application/javascript' })
    const jsUrl = URL.createObjectURL(jsBlob)
    
    // Load as module will execute the code and fetch the WASM using our override
    const wasm = await import(jsUrl)
    
    if (!wasm.default || !wasm.BrowserDb) {
      throw new Error('WASM module not properly loaded')
    }
    
    await wasm.default()
    
    return wasm.BrowserDb.open('minigraf')
  } finally {
    window.fetch = originalFetch
  }
}