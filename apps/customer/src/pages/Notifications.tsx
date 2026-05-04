import { Bell } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'

export default function NotificationsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-8">
            <Bell size={22} className="text-ink/60" />
            <h1 className="text-2xl font-medium text-ink">Notifications</h1>
          </div>
          <div className="text-center py-16">
            <Bell size={36} className="mx-auto text-ink/15 mb-3" />
            <p className="text-ink/40 text-sm">You're all caught up.</p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
