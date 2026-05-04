import { PageTransition } from '../components/PageTransition'
import { Search } from 'lucide-react'

export default function SearchPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-bone p-4">
        <h1 className="font-display font-medium text-ink text-2xl tracking-tight mb-4">Search Medicines</h1>
        <div className="flex items-center gap-3 bg-paper border border-line rounded-md px-4 py-3 focus-within:border-brand-indigo transition-colors shadow-soft">
          <Search size={16} className="text-ink/30" />
          <input
            autoFocus
            type="text"
            placeholder="Type a medicine name…"
            className="flex-1 bg-transparent text-ink placeholder-ink/30 outline-none text-sm"
          />
        </div>
        <p className="text-ink/40 text-sm mt-8 text-center">Search results will appear here</p>
      </div>
    </PageTransition>
  )
}
