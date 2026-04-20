'use client'
import { useState, useCallback } from 'react'
import { NavBar } from './NavBar'
import { ResizeHandle } from './ResizeHandle'

type Mode = 'sandbox' | 'lessons'

export function AppShell() {
  const [mode, setMode] = useState<Mode>('sandbox')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidthPct, setLeftWidthPct] = useState(66)

  const handleResize = useCallback((deltaX: number) => {
    setLeftWidthPct((prev) => {
      const containerWidth = window.innerWidth
      const deltaPct = (deltaX / containerWidth) * 100
      const newPct = prev + deltaPct
      return Math.min(80, Math.max(40, newPct))
    })
  }, [])

  const handleModeChange = useCallback((m: Mode) => {
    setMode(m)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <NavBar
        mode={mode}
        onModeChange={handleModeChange}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${leftWidthPct}%` }}
        >
          {/* Editor placeholder */}
          <div className="flex-1 flex items-center justify-center text-gray-500 border-b border-gray-800">
            <p>Editor — coming in Task 2.2</p>
          </div>
          {/* Results placeholder */}
          <div className="h-1/2 flex items-center justify-center text-gray-500">
            <p>Results — coming in Task 2.3</p>
          </div>
        </div>

        {/* Resize handle */}
        <ResizeHandle onResize={handleResize} />

        {/* Right panel - Chat */}
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Chat — coming in Task 2.4</p>
        </div>
      </div>

      {/* Settings drawer placeholder */}
      {settingsOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 p-4">
          <div className="text-gray-400">
            Settings drawer — coming in Task 2.5
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="mt-4 text-sm text-gray-500 hover:text-white"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}