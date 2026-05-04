import type { OrderStatus } from '@pharmabridge/types'

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING:          { label: 'Pending',      className: 'bg-peach text-warning' },
  CONFIRMED:        { label: 'Confirmed',    className: 'bg-mist text-brand-indigo' },
  PROCESSING:       { label: 'Processing',   className: 'bg-mist text-brand-indigo' },
  OUT_FOR_DELIVERY: { label: 'On the Way',   className: 'bg-mint text-rx' },
  DELIVERED:        { label: 'Delivered',    className: 'bg-mint text-rx' },
  CANCELLED:        { label: 'Cancelled',    className: 'bg-blush text-danger' },
}

export interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { label, className: statusClass } = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${statusClass} ${className}`}
    >
      {label}
    </span>
  )
}

export interface PillBadgeProps {
  label: string
  className?: string
}

export function PillBadge({ label, className = '' }: PillBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium bg-bone text-ink/60 border border-line ${className}`}
    >
      {label}
    </span>
  )
}
