import { Link } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center text-center px-4">
        <p className="font-mono text-ink/30 text-sm mb-3 uppercase tracking-widest">404</p>
        <h1 className="font-display font-medium text-ink text-2xl tracking-tight mb-2">Page not found</h1>
        <p className="text-ink/50 text-sm mb-8 max-w-xs">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center h-11 rounded-md bg-ink px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </PageTransition>
  )
}
