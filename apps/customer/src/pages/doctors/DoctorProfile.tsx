import React, { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, MapPin, CheckCircle, Languages, Calendar,
  Clock, ArrowRight, Star, CalendarCheck,
} from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'
import { useAuthStore } from '../../stores/authStore'
import { useLocationStore } from '../../stores/locationStore'
import { api } from '../../lib/axios'

// ── Types ──────────────────────────────────────────────────────────────────

type SpecialtyValue =
  | 'GENERAL_PHYSICIAN' | 'CARDIOLOGIST' | 'DERMATOLOGIST' | 'ENDOCRINOLOGIST'
  | 'GASTROENTEROLOGIST' | 'NEUROLOGIST' | 'ONCOLOGIST' | 'OPHTHALMOLOGIST'
  | 'ORTHOPEDIST' | 'PEDIATRICIAN' | 'PSYCHIATRIST' | 'PULMONOLOGIST'
  | 'UROLOGIST' | 'OTHER'

type ConsultationType = 'IN_PERSON' | 'VIDEO' | 'CHAT'
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

interface Availability {
  id: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string
  slotMins: number; maxSlots: number; isActive: boolean
}

interface DoctorDetail {
  id: string; name: string; specialty: string; qualifications: string
  experience: number; consultationFee: number; imageUrl: string | null
  languages: string[]; isVerified: boolean; bio: string | null
  availability: Availability[]
  pharmacy: {
    id: string; name: string; phone: string; logoUrl: string | null
    lat: number | null; lng: number | null
    address: { line1: string; line2?: string; city: string; state: string; pincode: string }
  }
}

interface TimeSlot { startTime: string; endTime: string; isAvailable: boolean }

interface ConfirmedAppointment {
  id: string
  appointmentNumber: string
  appointmentDate: string
  startTime: string
  endTime: string
  doctor: { name: string; specialty: string; pharmacy: { name: string; address: { line1: string; city: string; state: string } } }
}

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

const JS_DAY_TO_DOW: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateICS(apt: ConfirmedAppointment) {
  const date = new Date(apt.appointmentDate)
  const ymd  = toYMD(date).replace(/-/g, '')
  const start = apt.startTime.replace(':', '') + '00'
  const end   = apt.endTime.replace(':', '')   + '00'
  const addr  = apt.doctor.pharmacy.address
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PharmaBridge//EN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Asia/Kolkata:${ymd}T${start}`,
    `DTEND;TZID=Asia/Kolkata:${ymd}T${end}`,
    `SUMMARY:Appointment with ${apt.doctor.name}`,
    `DESCRIPTION:${SPECIALTY_LABELS[apt.doctor.specialty as SpecialtyValue] ?? apt.doctor.specialty} at ${apt.doctor.pharmacy.name}`,
    `LOCATION:${addr.line1}, ${addr.city}, ${addr.state}`,
    `UID:${apt.id}@pharmabridge.in`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `apt-${apt.appointmentNumber}.ics`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── SuccessScreen ──────────────────────────────────────────────────────────

function SuccessScreen({ apt }: { apt: ConfirmedAppointment }) {
  const date = new Date(apt.appointmentDate)
  const addr = apt.doctor.pharmacy.address

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-10 px-6"
    >
      {/* Ring animation */}
      <div className="relative w-20 h-20 mb-6">
        <motion.svg viewBox="0 0 80 80" className="absolute inset-0 w-20 h-20">
          <motion.circle
            cx="40" cy="40" r="36"
            fill="none" stroke="currentColor" strokeWidth="2"
            className="text-rx" strokeLinecap="round"
            strokeDasharray="226" strokeDashoffset="226"
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          />
        </motion.svg>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
        >
          <CalendarCheck size={32} className="text-rx" />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        <h2 className="text-xl font-medium text-ink mb-1">Appointment Confirmed!</h2>
        <p className="text-sm text-ink/50 mb-6">The pharmacy will call to confirm your slot.</p>

        {/* Details card */}
        <div className="w-full bg-paper border border-line rounded-2xl p-5 text-left space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-ink/35">
              {apt.appointmentNumber}
            </span>
          </div>
          <div className="space-y-2 pt-2 border-t border-line text-sm">
            <div className="flex justify-between">
              <span className="text-ink/50">Doctor</span>
              <span className="text-ink font-medium">{apt.doctor.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50">Date</span>
              <span className="text-ink font-medium">
                {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50">Time</span>
              <span className="text-ink font-medium">
                {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50">Location</span>
              <span className="text-ink font-medium text-right max-w-[55%] leading-tight">
                {addr.line1}, {addr.city}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => generateICS(apt)}
            className="flex items-center justify-center gap-2 h-11 rounded-md border border-line text-ink text-sm font-medium hover:bg-bone transition-colors"
          >
            <Calendar size={15} />
            Add to Calendar
          </button>
          <Link
            to="/appointments"
            className="flex items-center justify-center gap-2 h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors"
          >
            View My Appointments
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── DoctorProfilePage ──────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const { user }   = useAuthStore()
  const { lat: uLat, lng: uLng } = useLocationStore()

  // State
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [consultType, setConsultType]   = useState<ConsultationType>('IN_PERSON')
  const [age, setAge]                   = useState('')
  const [symptoms, setSymptoms]         = useState('')
  const [confirmed, setConfirmed]       = useState<ConfirmedAppointment | null>(null)

  // 7-day window
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i); return d
    }), [today])

  // Fetch doctor
  const { data: doctor, isLoading: docLoading } = useQuery<DoctorDetail>({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}`)
      return res.data.data as DoctorDetail
    },
    enabled: !!id,
  })

  // Available days from doctor's schedule
  const availableDays = useMemo(() =>
    new Set((doctor?.availability ?? []).map((a) => a.dayOfWeek)),
  [doctor])

  // Fetch slots for selected date
  const dateStr = toYMD(selectedDate)
  const { data: slots = [], isFetching: slotsFetching } = useQuery<TimeSlot[]>({
    queryKey: ['slots', id, dateStr],
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}/slots?date=${dateStr}`)
      return res.data.data as TimeSlot[]
    },
    enabled: !!id && availableDays.has(JS_DAY_TO_DOW[selectedDate.getDay()]),
    staleTime: 60_000,
  })

  // Book appointment
  const bookMutation = useMutation({
    mutationFn: async () => {
      const fullSymptoms = [age ? `Age: ${age} years.` : '', symptoms].filter(Boolean).join(' ')
      const res = await api.post('/appointments', {
        doctorId:        id,
        appointmentDate: dateStr,
        startTime:       selectedSlot,
        consultationType: consultType,
        ...(fullSymptoms ? { symptoms: fullSymptoms } : {}),
        paymentMethod:   'COD',
      })
      return res.data.data as ConfirmedAppointment
    },
    onSuccess: (data) => setConfirmed(data),
  })

  const distance = uLat && uLng && doctor?.pharmacy.lat && doctor?.pharmacy.lng
    ? haversine(uLat, uLng, doctor.pharmacy.lat, doctor.pharmacy.lng)
    : null

  if (confirmed) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-bone">
          <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-md border-b border-line px-4 py-3">
            <button onClick={() => navigate('/appointments')} className="p-1.5 -ml-1.5 rounded-md hover:bg-paper transition-colors">
              <ArrowLeft size={18} className="text-ink/60" />
            </button>
          </div>
          <div className="max-w-lg mx-auto">
            <SuccessScreen apt={confirmed} />
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone pb-16">

        {/* ── Back header ── */}
        <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-md hover:bg-paper transition-colors">
              <ArrowLeft size={18} className="text-ink/60" />
            </button>
            <span className="text-sm font-medium text-ink truncate">
              {docLoading ? '…' : doctor?.name}
            </span>
          </div>
        </div>

        {/* ── Loading ── */}
        {docLoading && (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <div className="h-32 rounded-2xl bg-paper border border-line animate-pulse" />
            <div className="h-20 rounded-2xl bg-paper border border-line animate-pulse" />
            <div className="h-40 rounded-2xl bg-paper border border-line animate-pulse" />
          </div>
        )}

        {!docLoading && doctor && (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

            {/* ── Hero card ── */}
            <div className="bg-paper border border-line rounded-2xl p-5">
              <div className="flex items-start gap-4">
                {/* Large avatar */}
                <div className="w-20 h-20 rounded-2xl bg-mist border border-line flex items-center justify-center shrink-0 overflow-hidden">
                  {doctor.imageUrl
                    ? <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
                    : <span className="text-xl font-medium text-ink/50 select-none">
                        {doctor.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-lg font-medium text-ink">{doctor.name}</h1>
                    {doctor.isVerified && <CheckCircle size={14} className="text-rx shrink-0" />}
                  </div>
                  <p className="text-sm text-ink/60 mt-0.5">
                    {SPECIALTY_LABELS[doctor.specialty as SpecialtyValue] ?? doctor.specialty}
                  </p>
                  <p className="text-xs text-ink/40 mt-1 line-clamp-2">{doctor.qualifications}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-line text-sm">
                <span className="flex items-center gap-1.5 text-ink/60">
                  <Star size={12} />
                  {doctor.experience} yr{doctor.experience !== 1 ? 's' : ''} exp
                </span>
                <span className="flex items-center gap-1.5 text-ink/60">
                  <Languages size={12} />
                  {doctor.languages.slice(0, 2).join(', ')}
                  {doctor.languages.length > 2 && ` +${doctor.languages.length - 2}`}
                </span>
              </div>

              {/* Consultation fee */}
              <div className="mt-3">
                {doctor.consultationFee === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-mint border border-rx/20 text-rx">
                    <CheckCircle size={13} />
                    Consultation: FREE
                  </span>
                ) : (
                  <span className="text-sm font-medium text-ink">
                    Consultation: ₹{doctor.consultationFee}
                  </span>
                )}
              </div>
            </div>

            {/* ── Pharmacy card ── */}
            <div className="bg-paper border border-line rounded-2xl p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-ink/35 mb-3">At this pharmacy</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-bone border border-line flex items-center justify-center shrink-0 overflow-hidden">
                  {doctor.pharmacy.logoUrl
                    ? <img src={doctor.pharmacy.logoUrl} alt="" className="w-full h-full object-cover" />
                    : <MapPin size={14} className="text-ink/30" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{doctor.pharmacy.name}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {doctor.pharmacy.address.line1}, {doctor.pharmacy.address.city}
                  </p>
                  <p className="text-xs text-ink/35 mt-0.5">
                    {doctor.pharmacy.address.state} – {doctor.pharmacy.address.pincode}
                  </p>
                  {distance !== null && (
                    <p className="text-xs text-ink/40 mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bio ── */}
            {doctor.bio && (
              <div className="bg-paper border border-line rounded-2xl p-5">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/35 mb-2">About</p>
                <p className="text-sm text-ink/70 leading-relaxed">{doctor.bio}</p>
              </div>
            )}

            {/* ── Date picker ── */}
            <div className="bg-paper border border-line rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-ink/40" />
                <p className="text-sm font-medium text-ink">Select a date</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {days.map((day) => {
                  const dow     = JS_DAY_TO_DOW[day.getDay()]
                  const hasAvail = availableDays.has(dow)
                  const isSelected = toYMD(day) === toYMD(selectedDate)

                  return (
                    <button
                      key={toYMD(day)}
                      onClick={() => { setSelectedDate(day); setSelectedSlot(null) }}
                      disabled={!hasAvail}
                      className={`shrink-0 w-14 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-colors ${
                        isSelected
                          ? 'border-ink bg-ink text-paper'
                          : hasAvail
                          ? 'border-line hover:border-ink/30 text-ink'
                          : 'border-line text-ink/25 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-medium leading-none">{day.getDate()}</span>
                      <span className="text-[9px] opacity-70">
                        {day.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Time slots ── */}
            {availableDays.has(JS_DAY_TO_DOW[selectedDate.getDay()]) && (
              <div className="bg-paper border border-line rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-ink/40" />
                  <p className="text-sm font-medium text-ink">Available slots</p>
                  <span className="text-xs text-ink/40">
                    {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {slotsFetching ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="h-9 rounded-lg bg-bone animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-ink/40 text-center py-4">No slots available for this date</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isSelected = slot.startTime === selectedSlot
                      return (
                        <button
                          key={slot.startTime}
                          onClick={() => slot.isAvailable && setSelectedSlot(slot.startTime)}
                          disabled={!slot.isAvailable}
                          className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                            isSelected
                              ? 'border-rx bg-mint text-rx'
                              : slot.isAvailable
                              ? 'border-rx/30 text-rx hover:bg-mint/50'
                              : 'border-line text-ink/20 line-through cursor-not-allowed bg-bone'
                          }`}
                        >
                          {formatTime(slot.startTime)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Booking form (after slot selected) ── */}
            <AnimatePresence>
              {selectedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-paper border border-line rounded-2xl p-5 space-y-4"
                >
                  <p className="text-sm font-medium text-ink">Confirm your booking</p>

                  {/* Selected slot summary */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-mint rounded-lg border border-rx/20 text-sm text-rx">
                    <Clock size={13} />
                    <span>
                      {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{formatTime(selectedSlot)}
                    </span>
                  </div>

                  {/* Patient info (read-only pre-fill) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-ink/50 mb-1 block">Patient name</label>
                      <div className="h-10 border border-line rounded-md px-3 flex items-center text-sm text-ink/70 bg-bone">
                        {user?.name ?? '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-ink/50 mb-1 block">Phone</label>
                      <div className="h-10 border border-line rounded-md px-3 flex items-center text-sm text-ink/70 bg-bone">
                        {user?.phone ?? '—'}
                      </div>
                    </div>
                  </div>

                  {/* Age (optional) */}
                  <div>
                    <label className="text-xs text-ink/50 mb-1 block">Age (optional)</label>
                    <input
                      type="number"
                      min={1} max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Years"
                      className="w-full h-10 border border-line rounded-md px-3 text-sm text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors bg-paper"
                    />
                  </div>

                  {/* Consultation type */}
                  <div>
                    <label className="text-xs text-ink/50 mb-2 block">Consultation type</label>
                    <div className="flex gap-2">
                      {(['IN_PERSON', 'VIDEO'] as ConsultationType[]).map((ct) => (
                        <button
                          key={ct}
                          onClick={() => setConsultType(ct)}
                          className={`flex-1 h-9 rounded-lg border text-xs font-medium transition-colors ${
                            consultType === ct
                              ? 'border-ink bg-ink text-paper'
                              : 'border-line text-ink/60 hover:border-ink/30'
                          }`}
                        >
                          {ct === 'IN_PERSON' ? 'In-person' : 'Video'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div>
                    <label className="text-xs text-ink/50 mb-1 block">Symptoms / reason (optional)</label>
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={3}
                      placeholder="Briefly describe your symptoms or reason for visit…"
                      className="w-full border border-line rounded-md px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors resize-none bg-paper"
                    />
                  </div>

                  {/* Error */}
                  {bookMutation.isError && (
                    <p className="text-xs text-danger">
                      {bookMutation.error instanceof Error
                        ? bookMutation.error.message
                        : 'Failed to book appointment. Please try again.'}
                    </p>
                  )}

                  {/* Confirm CTA */}
                  <button
                    onClick={() => bookMutation.mutate()}
                    disabled={bookMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-md bg-rx text-white text-sm font-medium uppercase tracking-wider hover:bg-rx-dark transition-colors disabled:opacity-50"
                  >
                    {bookMutation.isPending ? 'Booking…' : 'Confirm Appointment'}
                    {!bookMutation.isPending && <ArrowRight size={14} />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </div>
    </PageTransition>
  )
}
