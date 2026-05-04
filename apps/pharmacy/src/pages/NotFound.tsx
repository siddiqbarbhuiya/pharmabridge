import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center text-center px-4">
      <p className="font-mono text-ink/30 text-sm mb-3 uppercase tracking-widest">404</p>
      <h1 className="font-display font-medium text-ink text-xl tracking-tight mb-6">Page not found</h1>
      <Link
        to="/dashboard"
        className="inline-flex items-center justify-center h-10 rounded-md bg-rx px-5 text-sm font-medium uppercase tracking-wider text-paper hover:bg-rx-dark transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
