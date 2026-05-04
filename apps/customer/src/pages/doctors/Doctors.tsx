import { Stethoscope } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'

export default function DoctorsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-2">
            <Stethoscope size={22} className="text-ink/60" />
            <h1 className="text-2xl font-medium text-ink">Find a Doctor</h1>
          </div>
          <p className="text-ink/40 text-sm mb-10">
            Book in-person or video consultations at pharmacies near you.
          </p>

          {/* Search + filter skeleton */}
          <div className="h-11 rounded-md bg-bone border border-line mb-6 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-bone border border-line animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
