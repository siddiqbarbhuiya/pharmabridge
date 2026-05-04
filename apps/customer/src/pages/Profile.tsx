import { User } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { useAuthStore } from '../stores/authStore'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()

  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-8">
            <User size={22} className="text-ink/60" />
            <h1 className="text-2xl font-medium text-ink">Profile</h1>
          </div>

          {user && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-line">
                <p className="text-xs text-ink/40 uppercase tracking-widest font-mono mb-1">Name</p>
                <p className="text-ink font-medium">{user.name ?? '—'}</p>
              </div>
              <div className="p-4 rounded-lg border border-line">
                <p className="text-xs text-ink/40 uppercase tracking-widest font-mono mb-1">Phone</p>
                <p className="text-ink font-medium">+91 {user.phone}</p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="mt-8 inline-flex h-10 items-center rounded-md border border-danger/30 px-5 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </PageTransition>
  )
}
