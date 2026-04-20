// Manual WASM loader - no JS wrapper needed
export async function loadMinigraf() {
  // Fetch WASM
  const wasmRes = await fetch('/wasm/pkg/minigraf_bg.wasm')
  const wasmBuffer = await wasmRes.arrayBuffer()
  
  // The JS wrapper code - we'll manually replicate its logic
  // We need to read the __wbg_get_imports and other setup from minigraf.js
  // But let's try loading without imports first
  
  // Try simple instantiation with empty imports object
  // The JS code requires __wbindgen imports that reference wasm memory
  
  // Let's actually fetch the JS to see what imports it needs
  const jsRes = await fetch('/wasm/pkg/minigraf.js')
  const jsCode = await jsRes.text()
  
  // Find the imports needed - look for __wbg_get_imports
  const importsMatch = jsCode.match(/function __wbg_get_imports\(\)[\s\S]*?return \{[\s\S]*?\};/)
  
  // Create a minimal import object with needed functions
  // The JS code needs specific __wbindgen functions
  
  // Actually, the issue is the JS code expects wasm module with specific memory
  // Let's just call the init directly without imports (empty object) might fail
  // The real issue: JS sets up wasm globals that JS code references
  
  // New approach: Run the entire JS as a module in window context, 
  // using Blob URL for import.meta to work
  const originalFetch = window.fetch
  
  window.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('minigraf_bg.wasm')) {
      return new Response(wasmBuffer, { 
        headers: { 'Content-Type': 'application/wasm' } 
      })
    }
    return originalFetch(input as RequestInfo)
  }
  
  try {
    // For import.meta to work, we need to load as ES module
    // Create blob URL - this makes import.meta.url = blob URL
    // Then the JS will use relative URL to fetch WASM, which our fetch intercepts
    const jsBlob = new Blob([jsCode], { type: 'application/javascript' })
    const jsUrl = URL.createObjectURL(jsBlob)
    
    // Actually JS uses import.meta.url to compute WASM path
    // With blob URL, import.meta.url = blob URL, so path will be wrong
    // Need to fix the path calculation
    
    // Fix JS: replace import.meta.url usage with fixed path
    const fixedJs = jsCode.replace(
      /import\.meta\.url/g,
      "'/wasm/pkg/minigraf.js'"
    ).replace(
      /new URL\('minigraf_bg\.wasm', import\.meta\.url\)/g,
      "fetch('/wasm/pkg/minigraf_bg.wasm')"
    )
    
    const fixedBlob = new Blob([fixedJs], { type: 'application/javascript' })
    const fixedUrl = URL.createObjectURL(fixedBlob)
    
    // Now load as module
    const ns = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ fixedUrl) as {
      default: () => Promise<void>
      BrowserDb: {
        open: (name: string) => Promise<{
          execute: (q: string) => Promise<string>
          free: () => void
        }>
      }
    }
    
    URL.revokeObjectURL(jsUrl)
    URL.revokeObjectURL(fixedUrl)
    
    // Initialize and get database
    await ns.default()
    return ns.BrowserDb.open('minigraf')
  } finally {
    window.fetch = originalFetch
  }
}