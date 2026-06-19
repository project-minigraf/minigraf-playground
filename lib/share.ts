export function encodeQuery(query: string): string {
  return btoa(encodeURIComponent(query))
}

export function decodeQuery(encoded: string): string | null {
  if (!encoded) return null
  try {
    return decodeURIComponent(atob(encoded))
  } catch {
    return null
  }
}
