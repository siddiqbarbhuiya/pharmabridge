import { PageTransition } from '../components/PageTransition'

export default function OrdersPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-bone p-4">
        <h1 className="font-display font-medium text-ink text-2xl tracking-tight mb-6">My Orders</h1>
        <p className="text-ink/40 text-sm text-center mt-16">No orders yet</p>
      </div>
    </PageTransition>
  )
}
