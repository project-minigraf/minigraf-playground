import { render, screen } from '@testing-library/react'
import TermsPage from '@/app/terms/page'

describe('TermsPage', () => {
  beforeEach(() => {
    render(<TermsPage />)
  })

  it('renders the page heading', () => {
    expect(screen.getByRole('heading', { name: /terms & conditions/i, level: 1 })).toBeInTheDocument()
  })

  it('shows the last updated date', () => {
    expect(screen.getByText(/june 2026/i)).toBeInTheDocument()
  })

  it('lists all 5 local data types', () => {
    expect(screen.getByText(/api keys/i)).toBeInTheDocument()
    expect(screen.getByText(/graph state/i)).toBeInTheDocument()
    expect(screen.getByText(/lesson progress/i)).toBeInTheDocument()
    expect(screen.getByText(/chat history/i)).toBeInTheDocument()
    expect(screen.getByText(/provider and model preferences/i)).toBeInTheDocument()
  })

  it('includes all 5 provider privacy policy links', () => {
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('https://www.anthropic.com/legal/privacy')
    expect(hrefs).toContain('https://openai.com/policies/privacy-policy')
    expect(hrefs).toContain('https://policies.google.com/privacy')
    expect(hrefs).toContain('https://x.ai/legal/privacy-policy')
    expect(hrefs).toContain('https://groq.com/privacy-policy/')
  })

  it('includes the warranty disclaimer', () => {
    expect(screen.getByText(/provided as-is, without warranty/i)).toBeInTheDocument()
  })
})
