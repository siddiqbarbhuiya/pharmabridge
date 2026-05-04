import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Package, MapPin, CheckCircle } from 'lucide-react'
import { api } from '../lib/axios'
import { useToastStore } from '../stores/toastStore'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING:          { label: 'Pending',          cls: 'bg-amber-50 text-amber-600 border-amber-200'    },
  CONFIRMED:        { label: 'Confirmed',        cls: 'bg-mint text-rx border-rx/20'                   },
  PROCESSING:       { label: 'Processing',       cls: 'bg-blue-50 text-blue-600 border-blue-200'       },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-violet-50 text-violet-600 border-violet-200' },
  DELIVERED:        { label: 'Delivered',        cls: 'bg-bone text-ink/50 border-line'                },
  CANCELLED:        { label: 'Cancelled',        cls: 'bg-red-50 text-red-500 border-red-200'          },
}

// What the pharmacy can transition to
const NEXT_ACTIONS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }[]>> = {
  PENDING:    [{ label: 'Confirm Order',      next: 'CONFIRMED'        }],
  CONFIRMED:  [{ label: 'Start Processing',   next: 'PROCESSING'       }],
  PROCESSING: [{ label: 'Out for Delivery',   next: 'OUT_FOR_DELIVERY' }],
  OUT_FOR_DELIVERY: [{ label: 'Mark Delivered', next: 'DELIVERED'      }],
}

interface OrderDetail {
  id: string; orderNumber: string; status: OrderStatus
  paymentMethod: string; subtotal: number; deliveryFee: number; totalAmount: number
  prescriptionUrl: string | null; notes: string | null; createdAt: string
  items: { id: string; medicineName: string; quantity: number; unitPrice: number; totalPrice: number }[]
  customer: { name: string | null; phone: string }
  address: { line1: string; city: string; state: string; pincode: string }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function OrderDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const push        = useToastStore((s) => s.push)

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ['pharmacy-order', id],
    queryFn:  async () => {
      const res = await api.get(`/orders/${id}`)
      return res.data.data as OrderDetail
    },
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: OrderStatus; note?: string }) => {
      await api.patch(`/orders/${id}/status`, { status, note })
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-order', id] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] })
      push('success', `Order marked as ${STATUS_CONFIG[status].label}`)
    },
    onError: () => push('error', 'Failed to update order status'),
  })

  const actions = order ? (NEXT_ACTIONS[order.status] ?? []) : []

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-ink/50 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Orders
      </button>

      {isLoading && (
        <div className="space-y-4">
          <div className="h-10 w-48 bg-paper rounded-lg animate-pulse" />
          <div className="h-32 bg-paper border border-line rounded-2xl animate-pulse" />
        </div>
      )}

      {order && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <p className="font-mono text-xs text-ink/30 uppercase tracking-widest mb-1">{order.orderNumber}</p>
              <h1 className="text-xl font-semibold text-ink">{order.customer.name ?? order.customer.phone}</h1>
              <p className="text-xs text-ink/40 mt-1">{formatDate(order.createdAt)}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_CONFIG[order.status].cls}`}>
              {STATUS_CONFIG[order.status].label}
            </span>
          </div>

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {actions.map(({ label, next }) => (
                <button
                  key={next}
                  onClick={() => statusMutation.mutate({ status: next })}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
                >
                  <CheckCircle size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Items */}
          <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Items</p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-mist border border-line flex items-center justify-center shrink-0">
                      <Package size={13} className="text-ink/40" />
                    </div>
                    <div>
                      <p className="text-sm text-ink">{item.medicineName}</p>
                      <p className="text-xs text-ink/40">Qty: {item.quantity} × ₹{item.unitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-ink">₹{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-line space-y-1.5">
              <div className="flex justify-between text-sm text-ink/60">
                <span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-ink/60">
                <span>Delivery</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-line">
                <span>Total</span><span>₹{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={13} className="text-ink/40" />
              <p className="text-xs font-mono uppercase tracking-widest text-ink/30">Delivery Address</p>
            </div>
            <p className="text-sm text-ink">{order.address.line1}</p>
            <p className="text-sm text-ink/60">{order.address.city}, {order.address.state} — {order.address.pincode}</p>
          </div>

          {/* Payment */}
          <div className="bg-paper border border-line rounded-2xl px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-ink/60">Payment Method</p>
            <p className="text-sm font-medium text-ink">{order.paymentMethod}</p>
          </div>
        </>
      )}
    </div>
  )
}
