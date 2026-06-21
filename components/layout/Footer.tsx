'use client'
import { trackEvent } from '@/lib/analytics'
import type { EventName } from '@/lib/types'

const OUTBOUND_LINKS: { label: string; href: string; event: EventName }[] = [
  { label: 'GitHub', href: 'https://github.com/project-minigraf/minigraf', event: 'outbound_click_github' },
  { label: 'Wiki', href: 'https://github.com/project-minigraf/minigraf/wiki', event: 'outbound_click_wiki' },
  { label: 'docs.rs', href: 'https://docs.rs/minigraf', event: 'outbound_click_docs_rs' },
]

export function Footer() {
  return (
    <footer className="h-8 flex items-center justify-center gap-5 border-t border-gray-800 bg-gray-950 text-xs text-gray-500 shrink-0">
      {OUTBOUND_LINKS.map(({ label, href, event }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(event)}
          className="hover:text-gray-300 transition-colors"
        >
          {label}
        </a>
      ))}
      <a href="/terms" className="hover:text-gray-300 transition-colors">
        Terms
      </a>
    </footer>
  )
}
