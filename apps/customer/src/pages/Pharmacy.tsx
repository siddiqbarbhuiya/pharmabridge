import { useParams } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'

export default function PharmacyPage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Pharmacy</p>
          <h1 className="text-3xl font-medium text-ink mb-2">{slug}</h1>
          <p className="text-ink/40 text-sm">Pharmacy detail page — coming soon.</p>
        </div>
      </div>
    </PageTransition>
  )
}
