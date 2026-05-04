import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-ink/50 hover:text-ink transition-colors mb-8"
          >
            <ArrowLeft size={15} />
            Appointments
          </button>

          <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Appointment</p>
          <h1 className="text-2xl font-medium text-ink mb-6">Appointment detail</h1>

          {/* Info skeleton */}
          <div className="space-y-3 mb-8">
            {[Calendar, Clock].map((Icon, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-line">
                <Icon size={16} className="text-ink/30 shrink-0" />
                <div className="h-4 w-40 bg-bone rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Cancel button placeholder */}
          <button
            className="inline-flex h-10 items-center rounded-md border border-danger/30 px-5 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
          >
            Cancel appointment
          </button>

          <p className="text-ink/20 text-xs mt-6">ID: {id}</p>
        </div>
      </div>
    </PageTransition>
  )
}
