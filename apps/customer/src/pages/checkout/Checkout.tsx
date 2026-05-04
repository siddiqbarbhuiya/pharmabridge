import { PageTransition } from '../../components/PageTransition'

export default function CheckoutPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Checkout</p>
          <h1 className="text-3xl font-medium text-ink mb-2">Complete your order</h1>
          <p className="text-ink/40 text-sm">Checkout flow — coming soon.</p>
        </div>
      </div>
    </PageTransition>
  )
}
