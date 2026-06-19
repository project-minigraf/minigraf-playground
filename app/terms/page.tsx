export const metadata = { title: 'Terms & Conditions — Minigraf Playground' }

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 px-6 text-gray-300 space-y-8">
      <h1 className="text-2xl font-bold text-white">Terms &amp; Conditions</h1>
      <p className="text-sm text-gray-500">Last updated: June 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What stays in your browser</h2>
        <p>The following is stored exclusively in your browser&apos;s IndexedDB and is never transmitted to our servers:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Your API keys for Anthropic, OpenAI, Google, xAI, and Groq</li>
          <li>Your graph state (Datalog facts and rules you have asserted)</li>
          <li>Your lesson progress</li>
          <li>Your chat history with the AI tutor</li>
          <li>Your provider and model preferences</li>
        </ul>
        <p className="text-sm">Clearing browser storage or using a different browser resets all of the above.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What gets sent to third parties</h2>
        <p className="text-sm">When you use the AI tutor, your queries, chat messages, and lesson context are sent to the LLM provider you have selected. If you have not provided your own API key, a Groq-based anonymous fallback is used.</p>
        <p className="text-sm">Each provider processes this data under their own privacy policy:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><a href="https://www.anthropic.com/legal/privacy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
          <li><a href="https://openai.com/policies/privacy-policy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a></li>
          <li><a href="https://policies.google.com/privacy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
          <li><a href="https://x.ai/legal/privacy-policy" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">xAI Privacy Policy</a></li>
          <li><a href="https://groq.com/privacy-policy/" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Groq Privacy Policy</a></li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Disclaimer</h2>
        <p className="text-sm">Minigraf Playground is provided as-is, without warranty of any kind. It is an educational tool and is not intended for production use. Use at your own risk.</p>
      </section>
    </main>
  )
}
