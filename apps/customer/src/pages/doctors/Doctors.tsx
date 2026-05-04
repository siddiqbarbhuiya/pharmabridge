import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, ArrowRight, CheckCircle, Stethoscope } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'
import { useLocationStore } from '../../stores/locationStore'
import { api } from '../../lib/axios'

// ── Types ──────────────────────────────────────────────────────────────────

interface PharmacySummary {
  id: string; name: string; logoUrl: string | null
  lat: number | null; lng: number | null
  address: { line1: string; city: string; state: string; pincode: string }
}

interface DoctorListItem {
  id: string; name: string; specialty: string; qualifications: string
  experience: number; consultationFee: number; imageUrl: string | null
  languages: string[]; isVerified: boolean
  pharmacy: PharmacySummary
}

type SpecialtyValue =
  | 'GENERAL_PHYSICIAN' | 'CARDIOLOGIST' | 'DERMATOLOGIST' | 'ENDOCRINOLOGIST'
  | 'GASTROENTEROLOGIST' | 'NEUROLOGIST' | 'ONCOLOGIST' | 'OPHTHALMOLOGIST'
  | 'ORTHOPEDIST' | 'PEDIATRICIAN' | 'PSYCHIATRIST' | 'PULMONOLOGIST'
  | 'UROLOGIST' | 'OTHER'

// ── Constants ──────────────────────────────────────────────────────────────

const SPECIALTY_LABELS: Record<SpecialtyValue, string> = {
  GENERAL_PHYSICIAN:   'General Physician',
  CARDIOLOGIST:        'Cardiologist',
  DERMATOLOGIST:       'Dermatologist',
  ENDOCRINOLOGIST:     'Endocrinologist',
  GASTROENTEROLOGIST:  'Gastroenterologist',
  NEUROLOGIST:         'Neurologist',
  ONCOLOGIST:          'Oncologist',
  OPHTHALMOLOGIST:     'Ophthalmologist',
  ORTHOPEDIST:         'Orthopedist',
  PEDIATRICIAN:        'Pediatrician',
  PSYCHIATRIST:        'Psychiatrist',
  PULMONOLOGIST:       'Pulmonologist',
  UROLOGIST:           'Urologist',
  OTHER:               'Other',
}

const FILTER_CHIPS: { label: string; value: SpecialtyValue | null }[] = [
  { label: 'All',            value: null },
  { label: 'General',        value: 'GENERAL_PHYSICIAN' },
  { label: 'Dermatology',    value: 'DERMATOLOGIST' },
  { label: 'Cardiology',     value: 'CARDIOLOGIST' },
  { label: 'Pediatrics',     value: 'PEDIATRICIAN' },
  { label: 'Neurology',      value: 'NEUROLOGIST' },
  { label: 'Orthopedics',    value: 'ORTHOPEDIST' },
  { label: 'Eye Care',       value: 'OPHTHALMOLOGIST' },
  { label: 'Psychiatry',     value: 'PSYCHIATRIST' },
  { label: 'Endocrinology',  value: 'ENDOCRINOLOGIST' },
]

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── DoctorCard ─────────────────────────────────────────────────────────────

function DoctorCard({ doctor, userLat, userLng }: {
  doctor: DoctorListItem
  userLat: number | null
  userLng: number | null
}) {
  const initials = doctor.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const isFree   = doctor.consultationFee === 0
  const distance = userLat && userLng && doctor.pharmacy.lat && doctor.pharmacy.lng
    ? haversine(userLat, userLng, doctor.pharmacy.lat, doctor.pharmacy.lng)
    : null

  return (
    <Link
      to={`/doctors/${doctor.id}`}
      className="bg-paper border border-line rounded-2xl p-5 flex flex-col gap-4 hover:border-ink/20 hover:shadow-soft transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-mist border border-line flex items-center justify-center shrink-0 overflow-hidden">
          {doctor.imageUrl
            ? <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-medium text-ink/60 select-none">{initials}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-ink">{doctor.name}</p>
            {doctor.isVerified && <CheckCircle size={13} className="text-rx shrink-0" />}
          </div>
          <p className="text-xs text-ink/50 mt-0.5">
            {SPECIALTY_LABELS[doctor.specialty as SpecialtyValue] ?? doctor.specialty}
          </p>
          <p className="text-xs text-ink/35 mt-0.5 line-clamp-1">{doctor.qualifications}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center flex-wrap gap-1.5">
        <span className="text-xs px-2 py-0.5 rounded-full bg-bone border border-line text-ink/60">
          {doctor.experience} yr{doctor.experience !== 1 ? 's' : ''} exp
        </span>
        {doctor.languages.slice(0, 2).map((lang) => (
          <span key={lang} className="text-xs px-2 py-0.5 rounded-full bg-bone border border-line text-ink/50 capitalize">
            {lang}
          </span>
        ))}
        {doctor.languages.length > 2 && (
          <span className="text-xs text-ink/30">+{doctor.languages.length - 2}</span>
        )}
      </div>

      {/* Pharmacy + distance */}
      <div className="flex items-center gap-1.5 text-xs text-ink/50">
        <MapPin size={11} className="shrink-0" />
        <span className="truncate">{doctor.pharmacy.name}</span>
        {distance !== null && (
          <span className="shrink-0 ml-auto">{distance.toFixed(1)} km</span>
        )}
      </div>

      {/* Footer: fee + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        {isFree ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-mint border border-rx/20 text-rx">
            FREE
          </span>
        ) : (
          <span className="text-sm font-medium text-ink">₹{doctor.consultationFee}</span>
        )}
        <div className="flex items-center gap-1 text-xs font-medium text-ink/50 group-hover:text-rx group-hover:gap-1.5 transition-all duration-150">
          Book Appointment
          <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  )
}

// ── DoctorsPage ────────────────────────────────────────────────────────────

export default function DoctorsPage() {
  const [params] = useSearchParams()
  const { lat, lng } = useLocationStore()

  const [search, setSearch]       = useState(params.get('q') ?? '')
  const [debouncedQ, setDebounced] = useState(search)
  const [specialty, setSpecialty]  = useState<SpecialtyValue | null>(
    (params.get('specialty') as SpecialtyValue | null) ?? null
  )
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isFetching } = useQuery<{
    doctors: DoctorListItem[]; total: number; totalPages: number
  }>({
    queryKey: ['doctors', debouncedQ, specialty, page],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: '12' })
      if (debouncedQ.trim()) qs.set('search', debouncedQ.trim())
      if (specialty)         qs.set('specialty', specialty)
      const res = await api.get(`/doctors?${qs}`)
      return { doctors: res.data.data, total: res.data.meta?.total ?? 0, totalPages: res.data.meta?.totalPages ?? 1 }
    },
    staleTime: 60_000,
  })

  const doctors     = data?.doctors ?? []
  const totalPages  = data?.totalPages ?? 1
  const showSkeleton = isLoading || (isFetching && doctors.length === 0)

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-bone/90 backdrop-blur-sm border-b border-line">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5 bg-paper border border-line rounded-md px-3 py-2.5 focus-within:border-brand-indigo transition-colors shadow-soft">
              <Search size={14} className="text-ink/30 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or specialization…"
                className="flex-1 bg-transparent text-ink placeholder-ink/30 outline-none text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-ink/30 hover:text-ink/60 text-lg leading-none w-5 h-5 flex items-center justify-center">
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Specialty chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => { setSpecialty(chip.value); setPage(1) }}
                className={`shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  specialty === chip.value
                    ? 'bg-ink text-paper'
                    : 'bg-paper border border-line text-ink/60 hover:border-ink/30'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-5xl mx-auto px-4 py-6">

          {showSkeleton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-paper border border-line animate-pulse" />
              ))}
            </div>
          )}

          {!showSkeleton && doctors.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mist mb-4">
                <Stethoscope size={24} className="text-ink/30" />
              </div>
              <p className="text-ink/50 text-sm">No doctors found nearby</p>
              {(debouncedQ || specialty) && (
                <button
                  onClick={() => { setSearch(''); setSpecialty(null) }}
                  className="mt-3 text-xs text-ink underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!showSkeleton && doctors.length > 0 && (
            <>
              {data?.total !== undefined && (
                <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-4">
                  {data.total} doctor{data.total !== 1 ? 's' : ''} available
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((doc) => (
                  <DoctorCard key={doc.id} doctor={doc} userLat={lat} userLng={lng} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-9 px-4 rounded-md border border-line text-sm text-ink/60 hover:border-ink/30 transition-colors disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-ink/50">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-9 px-4 rounded-md border border-line text-sm text-ink/60 hover:border-ink/30 transition-colors disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
