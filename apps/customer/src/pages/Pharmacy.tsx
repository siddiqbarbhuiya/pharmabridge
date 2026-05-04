import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  CheckCircle,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { api } from '../lib/axios'

// ── Types ──────────────────────────────────────────────────────────────────

interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}

interface DaySchedule {
  open: string
  close: string
  isOpen: boolean
}

type OpeningHours = Partial<Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DaySchedule
>>

interface DoctorItem {
  id: string
  name: string
  specialty: string
  consultationFee: number
  imageUrl: string | null
  isVerified: boolean
  experience: number
  qualifications: string
}

interface PharmacyDetail {
  id: string
  name: string
  logoUrl: string | null
  phone: string
  address: Address
  deliveryRadius: number
  openingHours: OpeningHours | null
  isApproved: boolean
  doctors: DoctorItem[]
}

// ── Specialty labels ───────────────────────────────────────────────────────

const SPECIALTY_LABELS: Record<string, string> = {
  GENERAL_PHYSICIAN:  'General Physician',
  CARDIOLOGIST:       'Cardiologist',
  DERMATOLOGIST:      'Dermatologist',
  ENDOCRINOLOGIST:    'Endocrinologist',
  GASTROENTEROLOGIST: 'Gastroenterologist',
  NEUROLOGIST:        'Neurologist',
  ONCOLOGIST:         'Oncologist',
  OPHTHALMOLOGIST:    'Ophthalmologist',
  ORTHOPEDIST:        'Orthopedist',
  PEDIATRICIAN:       'Pediatrician',
  PSYCHIATRIST:       'Psychiatrist',
  PULMONOLOGIST:      'Pulmonologist',
  UROLOGIST:          'Urologist',
  OTHER:              'Other',
}

// ── DoctorCard ────────────────────────────────────────────────────────────

function DoctorCard({ doctor }: { doctor: DoctorItem }) {
  const initials = doctor.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Link
      to={`/doctors/${doctor.id}`}
      className="flex items-center gap-4 bg-paper border border-line rounded-xl px-4 py-4 hover:border-ink/20 transition-colors group"
    >
      {/* Photo or initials avatar */}
      <div className="w-14 h-14 rounded-full bg-mist border border-line flex items-center justify-center shrink-0 overflow-hidden">
        {doctor.imageUrl
          ? <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
          : <span className="text-sm font-medium text-ink/60 select-none">{initials}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-ink truncate">{doctor.name}</p>
          {doctor.isVerified && (
            <CheckCircle size={12} className="text-rx shrink-0" />
          )}
        </div>
        <p className="text-xs text-ink/50 mt-0.5">
          {SPECIALTY_LABELS[doctor.specialty] ?? doctor.specialty}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-ink/40">{doctor.experience} yr{doctor.experience !== 1 ? 's' : ''} exp</span>
          <span className="text-ink/20">·</span>
          <span className="text-xs font-medium text-ink">
            {doctor.consultationFee === 0 ? 'Free consultation' : `₹${doctor.consultationFee}`}
          </span>
        </div>
      </div>

      {/* Book CTA */}
      <div className="flex items-center gap-1 text-xs font-medium text-rx group-hover:gap-1.5 transition-all duration-150 shrink-0">
        Book Appointment
        <ArrowRight size={12} />
      </div>
    </Link>
  )
}

// ── OpeningHoursSection ────────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

function OpeningHoursSection({ hours }: { hours: OpeningHours }) {
  const todayKey = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as typeof DAYS[number]

  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const schedule = hours[day]
        if (!schedule) return null
        const isToday = day === todayKey

        return (
          <div
            key={day}
            className={`flex items-center justify-between text-sm ${
              isToday ? 'text-ink' : 'text-ink/45'
            }`}
          >
            <span className={`capitalize ${isToday ? 'font-medium' : ''}`}>
              {day}
              {isToday && (
                <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-rx">
                  today
                </span>
              )}
            </span>
            {schedule.isOpen
              ? <span className="font-mono text-xs">{schedule.open} – {schedule.close}</span>
              : <span className="text-danger/60 text-xs">Closed</span>
            }
          </div>
        )
      })}
    </div>
  )
}

// ── PharmacyPage ──────────────────────────────────────────────────────────

export default function PharmacyPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [hoursExpanded, setHoursExpanded] = useState(false)

  const { data: pharmacy, isLoading, isError } = useQuery<PharmacyDetail>({
    queryKey: ['pharmacy', slug],
    queryFn: async () => {
      const res = await api.get(`/pharmacies/${slug}`)
      return res.data.data as PharmacyDetail
    },
    enabled: !!slug,
  })

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-bone">
          <div className="sticky top-0 z-10 bg-bone border-b border-line px-4 py-4">
            <div className="h-4 w-32 rounded-md bg-paper border border-line animate-pulse" />
          </div>
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <div className="h-28 rounded-2xl bg-paper border border-line animate-pulse" />
            <div className="h-14 rounded-2xl bg-paper border border-line animate-pulse" />
            <div className="h-52 rounded-2xl bg-paper border border-line animate-pulse" />
          </div>
        </div>
      </PageTransition>
    )
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (isError || !pharmacy) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-bone flex flex-col items-center justify-center gap-4">
          <p className="text-ink/40 text-sm">Pharmacy not found</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-ink underline underline-offset-2 hover:text-ink/70 transition-colors"
          >
            Go back
          </button>
        </div>
      </PageTransition>
    )
  }

  const { address, openingHours, doctors = [] } = pharmacy
  const todayKey = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as keyof OpeningHours
  const todayHours = openingHours?.[todayKey]

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone pb-16">

        {/* ── Sticky back-bar ───────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-paper transition-colors"
            >
              <ArrowLeft size={18} className="text-ink/60" />
            </button>
            <span className="text-sm font-medium text-ink truncate">{pharmacy.name}</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ── Pharmacy header card ──────────────────────────────────── */}
          <div className="bg-paper border border-line rounded-2xl p-5">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="w-16 h-16 rounded-xl bg-bone border border-line flex items-center justify-center shrink-0 overflow-hidden">
                {pharmacy.logoUrl
                  ? <img src={pharmacy.logoUrl} alt="" className="w-full h-full object-cover" />
                  : <Building2 size={28} className="text-ink/30" />
                }
              </div>

              {/* Name + address */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-medium text-ink leading-tight">{pharmacy.name}</h1>
                  {pharmacy.isApproved && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-mint border border-rx/20 text-rx">
                      <CheckCircle size={9} />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink/50 mt-1">
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}
                </p>
                <p className="text-xs text-ink/30 mt-0.5">
                  {address.state} &mdash; {address.pincode}
                </p>
              </div>
            </div>

            {/* Quick-info strip */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mt-4 pt-4 border-t border-line">
              <a
                href={`tel:${pharmacy.phone}`}
                className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink transition-colors"
              >
                <Phone size={12} />
                {pharmacy.phone}
              </a>
              <span className="text-ink/20 text-xs">·</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink/50">
                <MapPin size={12} />
                Delivers up to {pharmacy.deliveryRadius} km
              </span>
              {todayHours && (
                <>
                  <span className="text-ink/20 text-xs">·</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs ${
                      todayHours.isOpen ? 'text-rx' : 'text-danger/70'
                    }`}
                  >
                    <Clock size={12} />
                    {todayHours.isOpen
                      ? `Open · ${todayHours.open}–${todayHours.close}`
                      : 'Closed today'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── Opening hours (collapsible) ───────────────────────────── */}
          {openingHours && (
            <div className="bg-paper border border-line rounded-2xl overflow-hidden">
              <button
                onClick={() => setHoursExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-bone/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-ink/40" />
                  <span className="text-sm font-medium text-ink">Opening hours</span>
                </div>
                <ChevronRight
                  size={15}
                  className={`text-ink/30 transition-transform duration-200 ${hoursExpanded ? 'rotate-90' : ''}`}
                />
              </button>
              {hoursExpanded && (
                <div className="px-5 pb-5 border-t border-line pt-4">
                  <OpeningHoursSection hours={openingHours} />
                </div>
              )}
            </div>
          )}

          {/* ── Doctors Available ─────────────────────────────────────── */}
          {doctors.length > 0 && (
            <section>
              <div className="mb-3">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/35 mb-1">
                  At this pharmacy
                </p>
                <h2 className="text-lg font-medium text-ink">
                  Doctors Available
                  <span className="text-sm font-normal text-ink/35 ml-2">
                    ({doctors.length})
                  </span>
                </h2>
              </div>
              <div className="space-y-3">
                {doctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </section>
          )}

          {/* ── Browse medicines ──────────────────────────────────────── */}
          <Link
            to={`/search?pharmacyId=${pharmacy.id}&type=medicines`}
            className="flex items-center justify-between bg-paper border border-line rounded-2xl px-5 py-4 hover:border-ink/20 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-ink">Browse medicines</p>
              <p className="text-xs text-ink/40 mt-0.5">
                Search available stock at {pharmacy.name}
              </p>
            </div>
            <ArrowRight
              size={16}
              className="text-ink/30 group-hover:text-ink/60 transition-colors shrink-0"
            />
          </Link>

        </div>
      </div>
    </PageTransition>
  )
}
