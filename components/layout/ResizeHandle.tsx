'use client'
import { useCallback, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (deltaX: number) => void
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onResize(ev.clientX - lastX.current)
      lastX.current = ev.clientX
    }

    const onUp = () => {
      dragging.current = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp, { once: true })

    return () => window.removeEventListener('mousemove', onMove)
  }, [onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 cursor-col-resize bg-gray-800 hover:bg-blue-600 transition-colors shrink-0"
    />
  )
}