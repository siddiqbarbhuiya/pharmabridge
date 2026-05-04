import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pill, Plus, Search, AlertCircle } from 'lucide-react'
import { api } from '../lib/axios'

interface Medicine {
  id: string; name: string; genericName: string | null
  category: string; price: number; stock: number
  isPrescriptionRequired: boolean; isActive: boolean
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">Out of stock</span>
  if (stock <= 10)  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Low: {stock}</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-bone text-ink/50 border border-line">{stock} in stock</span>
}

export default function MedicinesPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<Medicine[]>({
    queryKey: ['pharmacy-medicines', search],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '100' })
      if (search.trim()) qs.set('search', search.trim())
      const res = await api.get(`/medicines/search?${qs}`)
      return res.data.data as Medicine[]
    },
    staleTime: 30_000,
  })

  const medicines = data ?? []

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-semibold text-ink text-2xl tracking-tight">Medicines</h1>
        <Link
          to="/medicines/add"
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-rx text-paper text-xs font-medium uppercase tracking-wider hover:bg-rx-dark transition-colors"
        >
          <Plus size={14} />
          Add
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-paper border border-line rounded-lg px-3 py-2.5 mb-5 focus-within:border-ink/30 transition-colors">
        <Search size={14} className="text-ink/30 shrink-0" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicines…"
          className="flex-1 bg-transparent text-sm text-ink placeholder-ink/30 outline-none"
        />
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-paper border border-line animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && medicines.length === 0 && (
        <div className="text-center py-16">
          <Pill size={32} className="mx-auto text-ink/15 mb-3" />
          <p className="text-sm text-ink/40 mb-4">No medicines found</p>
          <Link to="/medicines/add" className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-line text-sm text-ink/60 hover:bg-bone transition-colors">
            <Plus size={14} /> Add your first medicine
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {medicines.map((med) => (
          <Link
            key={med.id}
            to={`/medicines/${med.id}/edit`}
            className="bg-paper border border-line rounded-xl px-4 py-3 flex items-center gap-3 hover:border-ink/20 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-mist border border-line flex items-center justify-center shrink-0">
              <Pill size={14} className="text-ink/40" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-ink">{med.name}</p>
                {med.isPrescriptionRequired && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-peach text-amber-700 font-medium uppercase tracking-wide">Rx</span>
                )}
                {!med.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bone text-ink/30 font-medium uppercase tracking-wide">Inactive</span>
                )}
              </div>
              {med.genericName && <p className="text-xs text-ink/40 truncate">{med.genericName}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StockBadge stock={med.stock} />
              <p className="text-sm font-medium text-ink">₹{med.price.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
