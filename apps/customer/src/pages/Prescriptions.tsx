import { FileText } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'

export default function PrescriptionsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-8">
            <FileText size={22} className="text-ink/60" />
            <h1 className="text-2xl font-medium text-ink">Prescriptions</h1>
          </div>
          <p className="text-ink/40 text-sm">Your uploaded prescriptions will appear here.</p>
        </div>
      </div>
    </PageTransition>
  )
}
