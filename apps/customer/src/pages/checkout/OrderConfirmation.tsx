import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Package } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'
import { api } from '../../lib/axios'

interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  paymentMethod: string
  totalAmount: number
  deliveryFee: number
  pharmacy: { name: string }
}

function SuccessRing() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      <motion.svg
        className="absolute inset-0 w-24 h-24"
        viewBox="0 0 96 96"
        fill="none"
      >
        <motion.circle
          cx="48" cy="48" r="44"
          stroke="currentColor"
          strokeWidth="2"
          className="text-rx"
          strokeLinecap="round"
          strokeDasharray="276"
          strokeDashoffset="276"
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        />
      </motion.svg>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      >
        <CheckCircle size={36} className="text-rx" />
      </motion.div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>()

  const { data: order, isLoading } = useQuery<OrderSummary>({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`)
      return res.data.data as OrderSummary
    },
    enabled: !!id,
  })

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center space-y-6">

          {/* Success ring animation */}
          <SuccessRing />

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h1 className="text-2xl font-medium text-ink mb-2">Order placed!</h1>
            <p className="text-ink/50 text-sm">
              Your order is confirmed and the pharmacy has been notified.
            </p>
          </motion.div>

          {/* Order details card */}
          {!isLoading && order && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-paper border border-line rounded-2xl p-5 text-left space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-mint flex items-center justify-center shrink-0">
                  <Package size={18} className="text-rx" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/40">
                    Order number
                  </p>
                  <p className="text-base font-medium text-ink">{order.orderNumber}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-line space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink/50">Pharmacy</span>
                  <span className="text-ink font-medium">{order.pharmacy.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink/50">Payment</span>
                  <span className="text-ink font-medium">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink/50">Total paid</span>
                  <span className="text-ink font-medium">₹{order.totalAmount.toFixed(0)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-line">
                <p className="text-xs text-ink/40 text-center">
                  Estimated delivery: <span className="font-medium text-ink/70">30–60 minutes</span>
                </p>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="h-36 rounded-2xl bg-paper border border-line animate-pulse" />
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col gap-3"
          >
            {id && (
              <Link
                to={`/orders/${id}`}
                className="flex items-center justify-center gap-2 h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors"
              >
                Track order
                <ArrowRight size={14} />
              </Link>
            )}
            <Link
              to="/"
              className="flex items-center justify-center h-11 rounded-md border border-line text-ink text-sm font-medium hover:bg-paper transition-colors"
            >
              Continue shopping
            </Link>
          </motion.div>

        </div>
      </div>
    </PageTransition>
  )
}
