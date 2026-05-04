import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingBag, TrendingUp, Package, AlertCircle,
  FileText, CalendarDays, ArrowRight,
} from 'lucide-react'
import { api } from '../lib/axios'
import { usePharmacyStore } from '../stores/pharmacyStore'

interface Stats {
  todayRevenue:         number
  todayOrders:          number
  pendingOrders:        number
  deliveredToday:       number
  lowStockCount:        number
  pendingPrescriptions: number
  todayAppointments:    number
  pendingAppointments:  number
}

function StatCard({
  label, value, sub, tint, icon: Icon, to,
}: {
  label: string
  value: string | number
  sub?: string
  tint: string
  icon: React.ElementType
  to?: string
}) {
  const content = (
    <div className={`${tint} border border-line rounded-2xl p-5 shadow-soft flex flex-col gap-3 h-full`}>
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 leading-tight">{label}</p>
        <Icon size={16} className="text-ink/30 shrink-0 mt-0.5" />
      </div>
      <div>
        <p className="font-display font-semibold text-ink text-3xl tracking-tight">{value}</p>
        {sub && <p className="text-ink/40 text-xs mt-1">{sub}</p>}
      </div>
      {to && (
        <div className="flex items-center gap-1 text-xs font-medium text-ink/40 hover:text-ink transition-colors mt-auto">
          View all <ArrowRight size={11} />
        </div>
      )}
    </div>
  )

  return to ? <Link to={to} className="block">{content}</Link> : content
}

export default function DashboardPage() {
  const { pharmacyData } = usePharmacyStore()

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/stats')
      return res.data.data as Stats
    },
    refetchInterval: 60_000,
  })

  const fmt = (n: number) => n.toLocaleString('en-IN')

  return (
    <div className="p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/30 mb-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="font-display font-semibold text-ink text-2xl tracking-tight">
          {pharmacyData?.name ?? 'Dashboard'}
        </h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-paper border border-line animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Primary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Today's Revenue"  value={`₹${fmt(stats?.todayRevenue ?? 0)}`}
              tint="bg-mint"           icon={TrendingUp}
            />
            <StatCard
              label="Pending Orders"   value={stats?.pendingOrders ?? 0}
              sub="orders"             tint="bg-peach"  icon={ShoppingBag}  to="/orders"
            />
            <StatCard
              label="Delivered Today"  value={stats?.deliveredToday ?? 0}
              sub="orders"             tint="bg-mist"   icon={Package}
            />
            <StatCard
              label="Low Stock"        value={stats?.lowStockCount ?? 0}
              sub="medicines"          tint="bg-blush"  icon={AlertCircle}   to="/medicines"
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Today's Orders"      value={stats?.todayOrders ?? 0}
              sub="received"              tint="bg-bone"  icon={ShoppingBag}  to="/orders"
            />
            <StatCard
              label="Pending Rx"          value={stats?.pendingPrescriptions ?? 0}
              sub="to review"             tint="bg-lilac" icon={FileText}      to="/prescriptions"
            />
            <StatCard
              label="Today's Appts"       value={stats?.todayAppointments ?? 0}
              sub="appointments"          tint="bg-sky"   icon={CalendarDays} to="/appointments"
            />
            <StatCard
              label="Pending Appts"       value={stats?.pendingAppointments ?? 0}
              sub="to confirm"            tint="bg-peach" icon={CalendarDays} to="/appointments"
            />
          </div>
        </>
      )}
    </div>
  )
}
