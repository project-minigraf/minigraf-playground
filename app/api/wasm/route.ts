import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const wasmPath = path.join(process.cwd(), 'public', 'wasm', 'pkg', 'minigraf.js')
  const js = fs.readFileSync(wasmPath, 'utf-8')
  return new NextResponse(js, {
    headers: { 'Content-Type': 'application/javascript' },
  })
}