import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'

export default function DoctorProfilePage() {
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
            Doctors
          </button>

          {/* Doctor card skeleton */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-20 h-20 rounded-xl bg-bone border border-line shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-bone rounded animate-pulse" />
              <div className="h-4 w-32 bg-bone rounded animate-pulse" />
              <div className="h-4 w-24 bg-bone rounded animate-pulse" />
            </div>
          </div>

          {/* Slots placeholder */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-ink/40" />
            <p className="text-sm font-medium text-ink">Available slots</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-9 rounded-md bg-bone border border-line animate-pulse" />
            ))}
          </div>

          <p className="text-ink/30 text-xs mt-4">Doctor ID: {id}</p>
        </div>
      </div>
    </PageTransition>
  )
}
