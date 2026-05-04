import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowLeft, MapPin, Navigation, Package, Building2, ChevronRight } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { useLocationStore } from '../stores/locationStore'
import { api } from '../lib/axios'

// ── Types ──────────────────────────────────────────────────────────────────

interface PharmacyResult {
  id: string
  name: string
  logoUrl: string | null
  address: { line1: string; line2?: string; city: string; state: string; pincode: string }
  phone: string
  deliveryRadius: number
  distanceKm: number
}

interface MedicineResult {
  id: string
  name: string
  genericName: string | null
  price: number
  mrp: number
  stock: number
  isPrescriptionRequired: boolean
  pharmacy: { id: string; name: string; logoUrl: string | null }
}

type Tab = 'medicines' | 'pharmacies'

// ── SearchPage ─────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [params] = useSearchParams()
  const { lat, lng, requestLocation, isLoading: locLoading } = useLocationStore()

  const initialQ     = params.get('q') ?? ''
  const initialTab   = (params.get('type') === 'pharmacy' ? 'pharmacies' : 'medicines') as Tab
  const pharmacyId   = params.get('pharmacyId') ?? undefined

  const [query, setQuery]       = useState(initialQ)
  const [tab, setTab]           = useState<Tab>(initialTab)
  const [debouncedQ, setDebounced] = useState(initialQ)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400)
    return () => clearTimeout(t)
  }, [query])

  // ── Medicine search ──────────────────────────────────────────────────────
  const { data: medicines = [], isFetching: medicinesFetching } = useQuery<MedicineResult[]>({
    queryKey: ['medicines-search', debouncedQ, pharmacyId],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '25' })
      if (debouncedQ.trim()) qs.set('q', debouncedQ.trim())
      if (pharmacyId)        qs.set('pharmacyId', pharmacyId)
      const res = await api.get(`/medicines/search?${qs}`)
      return (res.data.data ?? []) as MedicineResult[]
    },
    enabled: tab === 'medicines' && (!!debouncedQ.trim() || !!pharmacyId),
    staleTime: 60_000,
  })

  // ── Pharmacy search (location-based) ────────────────────────────────────
  const { data: pharmacies = [], isFetching: pharmaciesFetching } = useQuery<PharmacyResult[]>({
    queryKey: ['pharmacies-nearby', lat, lng],
    queryFn: async () => {
      const res = await api.get(`/pharmacies/nearby?lat=${lat}&lng=${lng}&radius=10&limit=30`)
      return (res.data.data ?? []) as PharmacyResult[]
    },
    enabled: tab === 'pharmacies' && !!lat && !!lng,
    staleTime: 5 * 60_000,
  })

  const filteredPharmacies = query.trim()
    ? pharmacies.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : pharmacies

  const showMedicinesHint   = tab === 'medicines' && !medicinesFetching && !debouncedQ.trim() && !pharmacyId
  const showMedicinesEmpty  = tab === 'medicines' && !medicinesFetching && (!!debouncedQ.trim() || !!pharmacyId) && medicines.length === 0

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-bone/90 backdrop-blur-sm border-b border-line">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              to="/"
              className="shrink-0 p-1.5 -ml-1.5 rounded-md hover:bg-paper transition-colors"
            >
              <ArrowLeft size={18} className="text-ink/60" />
            </Link>
            <div className="flex-1 flex items-center gap-2.5 bg-paper border border-line rounded-md px-3 py-2.5 focus-within:border-brand-indigo transition-colors shadow-soft">
              <Search size={14} className="text-ink/30 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'medicines' ? 'Search medicines, brands…' : 'Search pharmacies…'}
                className="flex-1 bg-transparent text-ink placeholder-ink/30 outline-none text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-ink/30 hover:text-ink/60 text-lg leading-none w-5 h-5 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex px-4">
            {(['medicines', 'pharmacies'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-ink text-ink'
                    : 'border-transparent text-ink/40 hover:text-ink/70'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-4 py-5">

          {/* ── Medicines tab ─────────────────────────────────────────── */}
          {tab === 'medicines' && (
            <>
              {showMedicinesHint && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mist mb-4">
                    <Package size={24} className="text-ink/30" />
                  </div>
                  <p className="text-ink/50 text-sm">Type a medicine name to search</p>
                  <p className="text-ink/30 text-xs mt-1">Brand name, generic name, or manufacturer</p>
                </div>
              )}

              {medicinesFetching && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-paper border border-line animate-pulse" />
                  ))}
                </div>
              )}

              {showMedicinesEmpty && (
                <div className="text-center py-20">
                  <p className="text-ink/50 text-sm">No medicines found</p>
                  <p className="text-ink/30 text-xs mt-1">Try a different name or spelling</p>
                </div>
              )}

              {!medicinesFetching && medicines.length > 0 && (
                <div className="space-y-2">
                  {medicines.map((m) => (
                    <Link
                      key={m.id}
                      to={`/medicine/${m.id}`}
                      className="flex items-center gap-4 bg-paper border border-line rounded-xl px-4 py-3.5 hover:border-ink/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-mint flex items-center justify-center shrink-0">
                        <Package size={16} className="text-rx" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                        {m.genericName && (
                          <p className="text-xs text-ink/40 truncate">{m.genericName}</p>
                        )}
                        <p className="text-xs text-ink/40 mt-0.5">{m.pharmacy.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-ink">₹{m.price}</p>
                        {m.mrp > m.price && (
                          <p className="text-xs text-ink/30 line-through">₹{m.mrp}</p>
                        )}
                        {m.isPrescriptionRequired && (
                          <span className="mt-0.5 inline-block text-[10px] px-1.5 py-0.5 rounded bg-blush font-mono uppercase tracking-wider text-danger">
                            Rx
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Pharmacies tab ────────────────────────────────────────── */}
          {tab === 'pharmacies' && (
            <>
              {!lat && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mint mb-6">
                    <MapPin size={28} className="text-rx" />
                  </div>
                  <p className="text-ink font-medium mb-2">Enable location</p>
                  <p className="text-ink/40 text-sm mb-6 max-w-xs mx-auto">
                    We need your location to find pharmacies near you
                  </p>
                  <button
                    onClick={requestLocation}
                    disabled={locLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-5 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors disabled:opacity-40"
                  >
                    <Navigation size={14} />
                    {locLoading ? 'Locating…' : 'Enable location'}
                  </button>
                </div>
              )}

              {lat && pharmaciesFetching && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-paper border border-line animate-pulse" />
                  ))}
                </div>
              )}

              {lat && !pharmaciesFetching && filteredPharmacies.length === 0 && (
                <div className="text-center py-20">
                  <Building2 size={36} className="text-ink/20 mx-auto mb-4" />
                  <p className="text-ink/50 text-sm">No pharmacies found nearby</p>
                  <p className="text-ink/30 text-xs mt-1">Try expanding your radius or check back later</p>
                </div>
              )}

              {lat && !pharmaciesFetching && filteredPharmacies.length > 0 && (
                <>
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">
                    {filteredPharmacies.length} pharmacies within 10 km
                  </p>
                  <div className="space-y-3">
                    {filteredPharmacies.map((p) => (
                      <Link
                        key={p.id}
                        to={`/pharmacy/${p.id}`}
                        className="flex items-start gap-4 bg-paper border border-line rounded-xl px-4 py-4 hover:border-ink/20 transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-bone border border-line flex items-center justify-center shrink-0 overflow-hidden">
                          {p.logoUrl
                            ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover" />
                            : <Building2 size={20} className="text-ink/30" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{p.name}</p>
                          <p className="text-xs text-ink/40 mt-0.5 truncate">
                            {p.address.line1}, {p.address.city}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs text-ink/50">
                              <MapPin size={10} />
                              {p.distanceKm.toFixed(1)} km away
                            </span>
                            <span className="text-ink/20">·</span>
                            <span className="text-xs text-ink/40">
                              Delivers {p.deliveryRadius} km
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-ink/20 group-hover:text-ink/50 transition-colors shrink-0 mt-1"
                        />
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </PageTransition>
  )
}
