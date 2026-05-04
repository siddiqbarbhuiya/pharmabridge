import { useParams } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'

export default function MedicinePage() {
  const { id } = useParams<{ id: string }>()

  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Medicine</p>
          <h1 className="text-3xl font-medium text-ink mb-2">Medicine detail</h1>
          <p className="text-ink/40 text-sm">ID: {id}</p>
        </div>
      </div>
    </PageTransition>
  )
}
