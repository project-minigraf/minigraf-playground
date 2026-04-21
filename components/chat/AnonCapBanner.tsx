interface AnonCapBannerProps {
  onOpenSettings: () => void
}

export function AnonCapBanner({ onOpenSettings }: AnonCapBannerProps) {
  return (
    <div className="mx-3 my-2 p-3 rounded-lg bg-amber-950/40 border border-amber-700 text-xs text-amber-300 flex items-start gap-2">
      <span>⚡</span>
      <span>
        Free quota used up.{' '}
        <button onClick={onOpenSettings} className="underline hover:text-amber-100">
          Add your own API key
        </button>{' '}
        for unlimited access.
      </span>
    </div>
  )
}