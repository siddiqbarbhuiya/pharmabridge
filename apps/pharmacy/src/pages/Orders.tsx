import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, ArrowRight, Calendar } from 'lucide-react'
import { io } from 'socket.io-client'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/authStore'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  items: { id: string }[]
  customer: { name: string | null; phone: string }
  pharmacy: { name: string }
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING:          { label: 'Pending',          cls: 'bg-amber-50 text-amber-600 border-amber-200'    },
  CONFIRMED:        { label: 'Confirmed',        cls: 'bg-mint text-rx border-rx/20'                   },
  PROCESSING:       { label: 'Processing',       cls: 'bg-blue-50 text-blue-600 border-blue-200'       },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-violet-50 text-violet-600 border-violet-200' },
  DELIVERED:        { label: 'Delivered',        cls: 'bg-bone text-ink/50 border-line'                },
  CANCELLED:        { label: 'Cancelled',        cls: 'bg-red-50 text-red-500 border-red-200'          },
}

const ACTIVE_STATUSES:  OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY']
const PAST_STATUSES:    OrderStatus[] = ['DELIVERED', 'CANCELLED']

type Tab = 'active' | 'past'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function OrdersPage() {
  const [tab, setTab]       = useState<Tab>('active')
  const { accessToken }     = useAuthStore()
  const queryClient         = useQueryClient()

  useEffect(() => {
    if (!accessToken) return
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'
    const socket    = io(`${socketUrl}/pharmacy`, {
      auth: { token: accessToken }, transports: ['websocket', 'polling'],
    })
    socket.on('order:new',            () => queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] }))
    socket.on('order:cancelled',      () => queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] }))
    return () => { socket.disconnect() }
  }, [accessToken, queryClient])

  const { data: allOrders, isLoading } = useQuery<OrderListItem[]>({
    queryKey: ['pharmacy-orders'],
    queryFn:  async () => {
      const res = await api.get('/pharmacy/orders?limit=100&sortOrder=desc')
      return res.data.data as OrderListItem[]
    },
    staleTime: 30_000,
  })

  const active = (allOrders ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status))
  const past   = (allOrders ?? []).filter((o) => PAST_STATUSES.includes(o.status))
  const items  = tab === 'active' ? active : past

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-semibold text-ink text-2xl tracking-tight">Orders</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line mb-5">
        {([['active', 'Active', active.length], ['past', 'Past', null]] as [Tab, string, number | null][]).map(([t, label, count]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-10 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-ink border-ink' : 'text-ink/40 border-transparent hover:text-ink/60'
            }`}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="ml-1.5 text-xs bg-ink text-paper rounded-full px-1.5 py-0.5">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-paper border border-line animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-20">
          <ShoppingBag size={32} className="mx-auto text-ink/15 mb-3" />
          <p className="text-sm text-ink/40">{tab === 'active' ? 'No active orders' : 'No past orders'}</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((order) => {
          const status = STATUS_CONFIG[order.status]
          return (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="bg-paper border border-line rounded-2xl px-4 py-3.5 flex items-center gap-4 hover:border-ink/20 hover:shadow-soft transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-ink font-mono">{order.orderNumber}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-ink/50 truncate">
                  {order.customer.name ?? order.customer.phone} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1 text-xs text-ink/35 mt-0.5">
                  <Calendar size={10} />
                  {formatDate(order.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm font-medium text-ink">₹{order.totalAmount.toFixed(0)}</p>
                <ArrowRight size={14} className="text-ink/30 group-hover:text-ink/60 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
