import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle,
  MapPin, AlertCircle, X, ExternalLink, Download,
} from 'lucide-react'
import { io } from 'socket.io-client'
import { PageTransition } from '../components/PageTransition'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

interface OrderItem {
  id: string
  medicineName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface TimelineEntry {
  id: string
  status: OrderStatus
  note: string | null
  createdAt: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentMethod: string
  paymentStatus: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  prescriptionUrl: string | null
  notes: string | null
  createdAt: string
  items: OrderItem[]
  timeline: TimelineEntry[]
  pharmacy: { id: string; name: string; phone: string; logoUrl: string | null }
  address: {
    line1: string; line2: string | null; city: string
    state: string; pincode: string; landmark: string | null
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING:          { label: 'Pending',          cls: 'bg-amber-50 text-amber-600 border-amber-200'    },
  CONFIRMED:        { label: 'Confirmed',        cls: 'bg-mint text-rx border-rx/20'                   },
  PROCESSING:       { label: 'Processing',       cls: 'bg-blue-50 text-blue-600 border-blue-200'       },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-violet-50 text-violet-600 border-violet-200' },
  DELIVERED:        { label: 'Delivered',        cls: 'bg-bone text-ink/50 border-line'                },
  CANCELLED:        { label: 'Cancelled',        cls: 'bg-red-50 text-red-500 border-red-200'          },
}

// The ordered steps for the progress timeline
const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING',          label: 'Order Placed'      },
  { status: 'CONFIRMED',        label: 'Confirmed'         },
  { status: 'PROCESSING',       label: 'Processing'        },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery'  },
  { status: 'DELIVERED',        label: 'Delivered'         },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING:          0,
  CONFIRMED:        1,
  PROCESSING:       2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED:        4,
  CANCELLED:        -1,
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ── OrderTimeline ──────────────────────────────────────────────────────────

function OrderTimeline({ order }: { order: OrderDetail }) {
  const isCancelled  = order.status === 'CANCELLED'
  const currentRank  = STATUS_ORDER[order.status]

  const timelineMap  = new Map(order.timeline.map((t) => [t.status, t]))

  if (isCancelled) {
    const cancelEntry = timelineMap.get('CANCELLED')
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 rounded-full bg-red-50 border-2 border-red-400 flex items-center justify-center shrink-0">
          <XCircle size={16} className="text-red-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-red-500">Order Cancelled</p>
          {cancelEntry && <p className="text-xs text-ink/40 mt-0.5">{formatDateTime(cancelEntry.createdAt)}</p>}
          {cancelEntry?.note && <p className="text-xs text-ink/50 mt-0.5 italic">"{cancelEntry.note}"</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, i) => {
        const stepRank   = STATUS_ORDER[step.status]
        const isDone     = stepRank <= currentRank
        const isActive   = stepRank === currentRank
        const isLast     = i === TIMELINE_STEPS.length - 1
        const entry      = timelineMap.get(step.status)

        return (
          <div key={step.status} className="flex gap-3">
            {/* Dot + connector */}
            <div className="flex flex-col items-center">
              <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isDone
                  ? isActive
                    ? 'border-rx bg-mint'
                    : 'border-rx/50 bg-mint/50'
                  : 'border-line bg-bone'
              }`}>
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-rx/20 animate-ping" />
                )}
                {isDone
                  ? <CheckCircle size={14} className={isActive ? 'text-rx' : 'text-rx/60'} />
                  : <div className="w-2 h-2 rounded-full bg-line" />
                }
              </div>
              {!isLast && (
                <div className={`w-px flex-1 my-1 ${stepRank < currentRank ? 'bg-rx/30' : 'bg-line'}`} />
              )}
            </div>

            {/* Label + timestamp */}
            <div className={`pb-5 ${isLast ? '' : ''}`}>
              <p className={`text-sm font-medium ${isDone ? 'text-ink' : 'text-ink/30'}`}>
                {step.label}
              </p>
              {entry && (
                <p className="text-xs text-ink/40 mt-0.5">{formatDateTime(entry.createdAt)}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CancelModal ────────────────────────────────────────────────────────────

function CancelModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: (reason: string) => void
  onClose:   () => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-sm bg-paper rounded-2xl shadow-xl p-6"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink/30 hover:text-ink/60 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Cancel this order?</p>
            <p className="text-xs text-ink/50 mt-0.5">Stock will be restored automatically.</p>
          </div>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={3}
          className="w-full bg-bone border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 resize-none mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-line text-sm text-ink/60 hover:bg-bone transition-colors"
          >
            Keep it
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="flex-1 h-10 rounded-lg bg-red-500 text-paper text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40"
          >
            {isPending ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Invoice generator ──────────────────────────────────────────────────────

function downloadInvoice(order: OrderDetail) {
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const rows = order.items.map((item) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.medicineName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${item.totalPrice.toFixed(2)}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice ${order.orderNumber}</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 32px; color: #08080e; font-size: 14px }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px }
  .muted { color: #666; font-size: 12px }
  table { width: 100%; border-collapse: collapse; margin-top: 24px }
  th { text-align: left; padding: 8px 12px; background: #f5f5f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em }
  .totals td { padding: 6px 12px }
  .total-row td { font-weight: 600; border-top: 2px solid #eee }
</style>
</head>
<body>
  <h1>PharmaBridge</h1>
  <p class="muted">Tax Invoice</p>
  <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
  <table style="width:100%;border:none;margin:0">
    <tr>
      <td style="vertical-align:top;padding:0">
        <p class="muted" style="margin:0 0 4px">Invoice No.</p>
        <p style="margin:0;font-weight:600">${order.orderNumber}</p>
        <p class="muted" style="margin:8px 0 4px">Date</p>
        <p style="margin:0">${date}</p>
      </td>
      <td style="vertical-align:top;text-align:right;padding:0">
        <p class="muted" style="margin:0 0 4px">Pharmacy</p>
        <p style="margin:0;font-weight:600">${order.pharmacy.name}</p>
        <p class="muted" style="margin:8px 0 4px">Delivery To</p>
        <p style="margin:0">${order.address.line1}, ${order.address.city}</p>
      </td>
    </tr>
  </table>
  <table>
    <thead><tr>
      <th>Medicine</th><th style="text-align:center">Qty</th>
      <th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot class="totals">
      <tr><td colspan="3" style="text-align:right;color:#666">Subtotal</td><td style="text-align:right">₹${order.subtotal.toFixed(2)}</td></tr>
      <tr><td colspan="3" style="text-align:right;color:#666">Delivery</td><td style="text-align:right">${order.deliveryFee === 0 ? 'FREE' : '₹' + order.deliveryFee.toFixed(2)}</td></tr>
      <tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">₹${order.totalAmount.toFixed(2)}</td></tr>
    </tfoot>
  </table>
  <p style="margin-top:32px;font-size:11px;color:#999;text-align:center">PharmaBridge — All prices include applicable taxes per Indian pharmaceutical regulations</p>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Invoice-${order.orderNumber}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ── OrderDetailPage ────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()
  const { accessToken } = useAuthStore()
  const [showCancel, setShowCancel] = useState(false)

  // Real-time status updates for this order
  useEffect(() => {
    if (!accessToken || !id) return
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'
    const socket    = io(`${socketUrl}/customer`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socket.on('order:status_updated', (data: { orderId: string }) => {
      if (data.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] })
      }
    })
    return () => { socket.disconnect() }
  }, [accessToken, id, queryClient])

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`)
      return res.data.data as OrderDetail
    },
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/orders/${id}/cancel`, reason ? { reason } : {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCancel(false)
    },
  })

  const canCancel = order?.status === 'PENDING'

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">
        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Back nav */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-ink/50 hover:text-ink transition-colors mb-6"
          >
            <ArrowLeft size={15} />
            Orders
          </button>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              <div className="h-10 w-56 bg-paper rounded-lg animate-pulse" />
              <div className="h-48 bg-paper border border-line rounded-2xl animate-pulse" />
              <div className="h-32 bg-paper border border-line rounded-2xl animate-pulse" />
            </div>
          )}

          {order && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-1">
                    {order.orderNumber}
                  </p>
                  <h1 className="text-xl font-medium text-ink">{order.pharmacy.name}</h1>
                  <p className="text-xs text-ink/40 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_CONFIG[order.status].cls}`}>
                  {STATUS_CONFIG[order.status].label}
                </span>
              </div>

              {/* Timeline */}
              <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-4">Status</p>
                <OrderTimeline order={order} />
              </div>

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
                      <span className="text-sm font-medium text-ink shrink-0">
                        ₹{item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-line space-y-1.5">
                  <div className="flex justify-between text-sm text-ink/60">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink/60">
                    <span>Delivery</span>
                    <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-ink pt-1 border-t border-line">
                    <span>Total</span>
                    <span>₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery address */}
              <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={13} className="text-ink/40" />
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/30">Delivery Address</p>
                </div>
                <p className="text-sm text-ink">
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ''}
                </p>
                <p className="text-sm text-ink/60">
                  {order.address.city}, {order.address.state} — {order.address.pincode}
                </p>
              </div>

              {/* Prescription */}
              {order.prescriptionUrl && (
                <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Prescription</p>
                  <a
                    href={order.prescriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-rx hover:underline"
                  >
                    View prescription
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={() => downloadInvoice(order)}
                  className="flex items-center justify-center gap-2 h-11 rounded-md border border-line text-sm font-medium text-ink/70 hover:bg-paper transition-colors"
                >
                  <Download size={15} />
                  Download Invoice
                </button>

                {canCancel && (
                  <button
                    onClick={() => setShowCancel(true)}
                    className="flex items-center justify-center h-11 rounded-md border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCancel && (
          <CancelModal
            onClose={() => setShowCancel(false)}
            onConfirm={(reason) => cancelMutation.mutate(reason)}
            isPending={cancelMutation.isPending}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
