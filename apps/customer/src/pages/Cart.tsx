import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { useCartStore } from '../stores/cartStore'

export default function CartPage() {
  const { items, itemCount } = useCartStore()
  const count = itemCount()

  return (
    <PageTransition>
      <div className="min-h-screen bg-paper">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-8">
            <ShoppingBag size={22} className="text-ink/60" />
            <h1 className="text-2xl font-medium text-ink">Cart</h1>
            {count > 0 && (
              <span className="ml-auto text-sm font-medium text-ink/50">{count} item{count !== 1 ? 's' : ''}</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-24">
              <ShoppingBag size={40} className="mx-auto text-ink/15 mb-4" />
              <p className="text-ink/40 text-sm mb-6">Your cart is empty</p>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 h-10 rounded-md bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90 transition-colors"
              >
                Browse medicines
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.medicine.id} className="flex items-center gap-4 p-4 rounded-lg border border-line">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm truncate">{item.medicine.name}</p>
                    <p className="text-ink/40 text-xs mt-0.5">₹{item.medicine.price} × {item.quantity}</p>
                  </div>
                  <p className="font-medium text-ink text-sm">₹{(item.medicine.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <div className="pt-4">
                <Link
                  to="/checkout"
                  className="w-full inline-flex items-center justify-center h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors"
                >
                  Proceed to checkout
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
