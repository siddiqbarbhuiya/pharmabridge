import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Calendar, ArrowRight, Package } from 'lucide-react'
import { io } from 'socket.io-client'
import { PageTransition } from '../components/PageTransition'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentMethod: string
  totalAmount: number
  createdAt: string
  items: { id: string }[]
  pharmacy: { id: string; name: string; logoUrl: string | null }
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: OrderStatus[]  = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY']
const PAST_STATUSES:   OrderStatus[]  = ['DELIVERED', 'CANCELLED']

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING:          { label: 'Pending',          cls: 'bg-amber-50 text-amber-600 border-amber-200'   },
  CONFIRMED:        { label: 'Confirmed',        cls: 'bg-mint text-rx border-rx/20'                  },
  PROCESSING:       { label: 'Processing',       cls: 'bg-blue-50 text-blue-600 border-blue-200'      },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-violet-50 text-violet-600 border-violet-200' },
  DELIVERED:        { label: 'Delivered',        cls: 'bg-bone text-ink/50 border-line'               },
  CANCELLED:        { label: 'Cancelled',        cls: 'bg-red-50 text-red-500 border-red-200'         },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── OrderCard ──────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: OrderListItem }) {
  const status    = STATUS_CONFIG[order.status]
  const initials  = order.pharmacy.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Link
      to={`/orders/${order.id}`}
      className="bg-paper border border-line rounded-2xl p-4 flex flex-col gap-3 hover:border-ink/20 hover:shadow-soft transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mist border border-line flex items-center justify-center shrink-0 overflow-hidden">
            {order.pharmacy.logoUrl
              ? <img src={order.pharmacy.logoUrl} alt={order.pharmacy.name} className="w-full h-full object-cover" />
              : <span className="text-xs font-medium text-ink/60 select-none">{initials}</span>
            }
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{order.pharmacy.name}</p>
            <p className="text-xs text-ink/40 font-mono mt-0.5">{order.orderNumber}</p>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-ink/50">
        <div className="flex items-center gap-1">
          <Package size={11} />
          <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
        </div>
        <span className="text-ink/20">·</span>
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        <span className="text-sm font-medium text-ink">₹{order.totalAmount.toFixed(0)}</span>
        <div className="flex items-center gap-1 text-xs font-medium text-ink/40 group-hover:text-rx group-hover:gap-1.5 transition-all">
          View order
          <ArrowRight size={11} />
        </div>
      </div>
    </Link>
  )
}

// ── OrdersPage ─────────────────────────────────────────────────────────────

type Tab = 'active' | 'past'

export default function OrdersPage() {
  const [tab, setTab]       = useState<Tab>('active')
  const { accessToken }     = useAuthStore()
  const queryClient         = useQueryClient()

  // Real-time order status updates
  useEffect(() => {
    if (!accessToken) return
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'
    const socket    = io(`${socketUrl}/customer`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    })

    socket.on('order:status_updated', (data: { orderId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] })
    })

    return () => { socket.disconnect() }
  }, [accessToken, queryClient])

  const { data: allOrders, isLoading } = useQuery<OrderListItem[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders?limit=100&sortOrder=desc')
      return res.data.data as OrderListItem[]
    },
    staleTime: 30_000,
  })

  const active = (allOrders ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status))
  const past   = (allOrders ?? []).filter((o) => PAST_STATUSES.includes(o.status))
  const items  = tab === 'active' ? active : past

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-sm border-b border-line px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-medium text-ink">My Orders</h1>
          </div>
          <div className="flex">
            {([['active', 'Active'], ['past', 'Past']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-10 px-4 text-sm font-medium transition-colors border-b-2 ${
                  tab === t
                    ? 'text-ink border-ink'
                    : 'text-ink/40 border-transparent hover:text-ink/60'
                }`}
              >
                {label}
                {t === 'active' && active.length > 0 && (
                  <span className="ml-1.5 text-xs font-medium bg-ink text-paper rounded-full px-1.5 py-0.5">
                    {active.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {isLoading && (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-paper border border-line animate-pulse" />
            ))
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mist mb-4">
                <ShoppingBag size={24} className="text-ink/30" />
              </div>
              <p className="text-ink/50 text-sm">
                {tab === 'active' ? 'No active orders' : 'No past orders'}
              </p>
              {tab === 'active' && (
                <Link
                  to="/"
                  className="mt-4 inline-flex items-center gap-2 h-10 rounded-md border border-line px-5 text-sm font-medium text-ink hover:bg-paper transition-colors"
                >
                  Browse medicines
                </Link>
              )}
            </div>
          )}

          {!isLoading && items.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
