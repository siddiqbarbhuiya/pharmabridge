export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-bone p-6">
      <h1 className="font-display font-medium text-ink text-2xl tracking-tight mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: '—', sub: 'INR', tint: 'bg-mint' },
          { label: 'Pending Orders', value: '—', sub: 'orders', tint: 'bg-peach' },
          { label: 'Delivered Today', value: '—', sub: 'orders', tint: 'bg-mist' },
          { label: 'Low Stock', value: '—', sub: 'medicines', tint: 'bg-blush' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.tint} border border-line rounded-2xl p-5 shadow-soft`}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-3">{stat.label}</p>
            <p className="font-display font-medium text-ink text-3xl tracking-tight">{stat.value}</p>
            {stat.sub && <p className="text-ink/40 text-xs mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
