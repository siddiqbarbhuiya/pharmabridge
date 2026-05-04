import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'

export default function OrderDetailPage() {
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
            Orders
          </button>
          <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Order detail</p>
          <h1 className="text-2xl font-medium text-ink mb-1">Order #{id?.slice(-6).toUpperCase()}</h1>
          <p className="text-ink/40 text-sm">Full order detail — coming soon.</p>
        </div>
      </div>
    </PageTransition>
  )
}
