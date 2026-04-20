import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params
  const filePath = path.join(process.cwd(), 'public', 'wasm', 'pkg', ...pathParts)
  
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }
  
  const content = fs.readFileSync(filePath)
  const ext = path.extname(filePath)
  
  const contentType = ext === '.wasm' ? 'application/wasm' : 'application/javascript'
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}