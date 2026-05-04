import { Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'

export default function AppointmentsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Calendar size={22} className="text-ink/60" />
              <h1 className="text-2xl font-medium text-ink">Appointments</h1>
            </div>
            <Link
              to="/doctors"
              className="inline-flex items-center h-9 rounded-md bg-ink px-4 text-xs font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors"
            >
              Book new
            </Link>
          </div>

          <div className="text-center py-16">
            <Calendar size={36} className="mx-auto text-ink/15 mb-3" />
            <p className="text-ink/40 text-sm mb-5">No appointments yet.</p>
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 h-10 rounded-md border border-line px-5 text-sm font-medium text-ink hover:bg-bone transition-colors"
            >
              Find a doctor
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
