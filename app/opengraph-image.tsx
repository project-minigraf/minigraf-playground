import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Minigraf Playground'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Minigraf Playground
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#a1a1aa',
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            Interactive browser-based tutorials for Minigraf, a graph database
            with Datalog and bi-temporal time travel
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: 24,
            color: '#52525b',
          }}
        >
          minigraf-playground.vercel.app
        </div>
      </div>
    ),
    { ...size }
  )
}
