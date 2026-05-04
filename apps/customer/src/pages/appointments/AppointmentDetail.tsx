import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Calendar, Clock, MapPin, User, MessageSquare,
  CheckCircle, XCircle, AlertCircle, Stethoscope, X,
} from 'lucide-react'
import { io } from 'socket.io-client'
import { PageTransition } from '../../components/PageTransition'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

type AptStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface AptDetail {
  id: string
  appointmentNumber: string
  appointmentDate: string
  startTime: string
  endTime: string
  status: AptStatus
  consultationType: 'IN_PERSON' | 'VIDEO' | 'CHAT'
  symptoms: string | null
  notes: string | null
  prescriptionUrl: string | null
  fee: number
  paymentStatus: string
  createdAt: string
  doctor: {
    id: string
    name: string
    specialty: string
    qualifications: string
    imageUrl: string | null
    isVerified: boolean
    experience: number
    languages: string[]
    pharmacy: {
      id: string
      name: string
      phone: string
      address: { line1: string; city: string; state: string; pincode: string }
      logoUrl: string | null
    }
  }
  customer: {
    id: string
    name: string | null
    phone: string
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<AptStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-mint text-rx border-rx/20'                },
  COMPLETED: { label: 'Completed', cls: 'bg-bone text-ink/50 border-line'             },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-500 border-red-200'       },
  NO_SHOW:   { label: 'No Show',   cls: 'bg-bone text-ink/30 border-line'             },
}

const CONSULT_LABEL: Record<string, string> = {
  IN_PERSON: 'In Person',
  VIDEO:     'Video Call',
  CHAT:      'Chat',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

function isWithin2Hrs(appointmentDate: string, startTime: string) {
  const [h, m] = startTime.split(':').map(Number)
  const dt = new Date(appointmentDate)
  dt.setHours(h, m, 0, 0)
  return dt.getTime() - Date.now() <= 2 * 60 * 60 * 1000
}

// ── Timeline ───────────────────────────────────────────────────────────────

type TimelineStep = { label: string; done: boolean; active: boolean; cancelled?: boolean }

function buildTimeline(status: AptStatus): TimelineStep[] {
  const isCancelled = status === 'CANCELLED' || status === 'NO_SHOW'
  return [
    {
      label:     'Booked',
      done:      true,
      active:    status === 'PENDING',
      cancelled: false,
    },
    {
      label:     isCancelled ? (status === 'NO_SHOW' ? 'No Show' : 'Cancelled') : 'Confirmed',
      done:      isCancelled || ['CONFIRMED', 'COMPLETED'].includes(status),
      active:    status === 'CONFIRMED',
      cancelled: isCancelled,
    },
    {
      label:     'Completed',
      done:      status === 'COMPLETED',
      active:    status === 'COMPLETED',
      cancelled: false,
    },
  ]
}

function StatusTimeline({ status }: { status: AptStatus }) {
  const steps = buildTimeline(status)
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
              step.cancelled
                ? 'border-red-400 bg-red-50'
                : step.done
                  ? 'border-rx bg-mint'
                  : 'border-line bg-bone'
            }`}>
              {step.cancelled
                ? <XCircle size={14} className="text-red-500" />
                : step.done
                  ? <CheckCircle size={14} className="text-rx" />
                  : <div className="w-2 h-2 rounded-full bg-line" />
              }
            </div>
            <span className={`text-xs text-center leading-tight ${
              step.active
                ? 'text-ink font-medium'
                : step.done && !step.cancelled
                  ? 'text-ink/60'
                  : 'text-ink/30'
            }`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-5 ${
              steps[i + 1].done || steps[i + 1].cancelled ? 'bg-rx/30' : 'bg-line'
            }`} />
          )}
        </div>
      ))}
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
            <p className="text-sm font-medium text-ink">Cancel appointment?</p>
            <p className="text-xs text-ink/50 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
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

// ── AppointmentDetailPage ──────────────────────────────────────────────────

export default function AppointmentDetailPage() {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const queryClient     = useQueryClient()
  const { accessToken } = useAuthStore()
  const [showCancel, setShowCancel] = useState(false)

  // Real-time update for this appointment
  useEffect(() => {
    if (!accessToken || !id) return
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'
    const socket    = io(`${socketUrl}/customer`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socket.on('appointment:status_updated', (data: { appointmentId: string }) => {
      if (data.appointmentId === id) {
        queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      }
    })
    return () => { socket.disconnect() }
  }, [accessToken, id, queryClient])

  const { data: apt, isLoading } = useQuery<AptDetail>({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const res = await api.get(`/appointments/${id}`)
      return res.data.data as AptDetail
    },
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/appointments/${id}/cancel`, reason ? { reason } : {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setShowCancel(false)
    },
  })

  const canCancel = apt
    && (apt.status === 'PENDING' || apt.status === 'CONFIRMED')
    && !isWithin2Hrs(apt.appointmentDate, apt.startTime)

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
            Appointments
          </button>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4">
              <div className="h-8 w-48 bg-paper rounded-lg animate-pulse" />
              <div className="h-40 bg-paper border border-line rounded-2xl animate-pulse" />
              <div className="h-32 bg-paper border border-line rounded-2xl animate-pulse" />
            </div>
          )}

          {apt && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-1">
                    {apt.appointmentNumber}
                  </p>
                  <h1 className="text-xl font-medium text-ink">Appointment</h1>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_CONFIG[apt.status].cls}`}>
                  {STATUS_CONFIG[apt.status].label}
                </span>
              </div>

              {/* Timeline */}
              <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-4">Status</p>
                <StatusTimeline status={apt.status} />
              </div>

              {/* Doctor card */}
              <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-3">Doctor</p>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-mist border border-line flex items-center justify-center shrink-0 overflow-hidden">
                    {apt.doctor.imageUrl
                      ? <img src={apt.doctor.imageUrl} alt={apt.doctor.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-medium text-ink/60 select-none">
                          {apt.doctor.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{apt.doctor.name}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {SPECIALTY_LABELS[apt.doctor.specialty] ?? apt.doctor.specialty}
                    </p>
                    <p className="text-xs text-ink/35 mt-0.5">{apt.doctor.qualifications}</p>
                  </div>
                  <Link
                    to={`/doctors/${apt.doctor.id}`}
                    className="shrink-0 text-xs font-medium text-ink/50 hover:text-rx transition-colors"
                  >
                    Profile
                  </Link>
                </div>
              </div>

              {/* Appointment info */}
              <div className="bg-paper border border-line rounded-2xl p-5 mb-4 space-y-3">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/30">Details</p>

                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={14} className="text-ink/40 shrink-0" />
                  <span className="text-ink">{formatDate(apt.appointmentDate)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={14} className="text-ink/40 shrink-0" />
                  <span className="text-ink">{formatTime(apt.startTime)} – {formatTime(apt.endTime)}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={14} className="text-ink/40 shrink-0 mt-0.5" />
                  <span className="text-ink">
                    {apt.doctor.pharmacy.name},&nbsp;
                    {apt.doctor.pharmacy.address.line1}, {apt.doctor.pharmacy.address.city}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Stethoscope size={14} className="text-ink/40 shrink-0" />
                  <span className="text-ink">{CONSULT_LABEL[apt.consultationType] ?? apt.consultationType}</span>
                </div>
                {apt.fee > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <User size={14} className="text-ink/40 shrink-0" />
                    <span className="text-ink">Consultation fee: ₹{apt.fee}</span>
                  </div>
                )}
              </div>

              {/* Symptoms */}
              {apt.symptoms && (
                <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/30 mb-2">Symptoms</p>
                  <p className="text-sm text-ink/70 leading-relaxed">{apt.symptoms}</p>
                </div>
              )}

              {/* Doctor notes */}
              {apt.notes && (
                <div className="bg-paper border border-line rounded-2xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={13} className="text-rx" />
                    <p className="text-xs font-mono uppercase tracking-widest text-ink/30">Doctor's Notes</p>
                  </div>
                  <p className="text-sm text-ink/70 leading-relaxed">{apt.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-6">
                {/* Book again */}
                <Link
                  to={`/doctors/${apt.doctor.id}`}
                  className="flex items-center justify-center gap-2 h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors"
                >
                  Book again
                </Link>

                {canCancel && (
                  <button
                    onClick={() => setShowCancel(true)}
                    className="flex items-center justify-center h-11 rounded-md border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Cancel appointment
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel modal */}
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
