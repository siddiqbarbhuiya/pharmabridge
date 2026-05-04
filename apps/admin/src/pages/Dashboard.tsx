export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-bone p-6">
      <h1 className="font-display font-medium text-ink text-2xl tracking-tight mb-6">Platform Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pharmacies', value: '—', tint: 'bg-mint' },
          { label: 'Pending Approvals', value: '—', tint: 'bg-peach' },
          { label: "Today's Orders", value: '—', tint: 'bg-mist' },
          { label: 'Active Customers', value: '—', tint: 'bg-lilac' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.tint} border border-line rounded-2xl p-5 shadow-soft`}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-3">{stat.label}</p>
            <p className="font-display font-medium text-ink text-3xl tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
