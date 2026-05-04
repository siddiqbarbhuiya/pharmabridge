import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react'
import { io } from 'socket.io-client'
import { PageTransition } from '../../components/PageTransition'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

type AptStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface AptDoctor {
  id: string
  name: string
  specialty: string
  imageUrl: string | null
  isVerified: boolean
  pharmacy: {
    id: string
    name: string
    address: { line1: string; city: string; state: string; pincode: string }
  }
}

interface AptItem {
  id: string
  appointmentNumber: string
  appointmentDate: string
  startTime: string
  endTime: string
  status: AptStatus
  consultationType: string
  fee: number
  doctor: AptDoctor
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
  PENDING:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-600 border-amber-200'  },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-mint text-rx border-rx/20'                 },
  COMPLETED: { label: 'Completed', cls: 'bg-bone text-ink/50 border-line'              },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-500 border-red-200'        },
  NO_SHOW:   { label: 'No Show',   cls: 'bg-bone text-ink/30 border-line'              },
}

const UPCOMING_STATUSES: AptStatus[] = ['PENDING', 'CONFIRMED']
const PAST_STATUSES:     AptStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW']

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
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

// ── AppointmentCard ────────────────────────────────────────────────────────

function AppointmentCard({
  apt,
  onCancel,
  cancelling,
}: {
  apt: AptItem
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const status     = STATUS_CONFIG[apt.status]
  const initials   = apt.doctor.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const canCancel  = UPCOMING_STATUSES.includes(apt.status) && !isWithin2Hrs(apt.appointmentDate, apt.startTime)

  return (
    <div className="bg-paper border border-line rounded-2xl p-4 flex flex-col gap-3">
      {/* Doctor header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-mist border border-line flex items-center justify-center shrink-0 overflow-hidden">
            {apt.doctor.imageUrl
              ? <img src={apt.doctor.imageUrl} alt={apt.doctor.name} className="w-full h-full object-cover" />
              : <span className="text-xs font-medium text-ink/60 select-none">{initials}</span>
            }
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{apt.doctor.name}</p>
            <p className="text-xs text-ink/50 mt-0.5">
              {SPECIALTY_LABELS[apt.doctor.specialty] ?? apt.doctor.specialty}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* Date / time / location */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-ink/60">
          <Calendar size={11} className="shrink-0" />
          <span>{formatDate(apt.appointmentDate)}</span>
          <span className="text-ink/25">·</span>
          <Clock size={11} className="shrink-0" />
          <span>{formatTime(apt.startTime)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink/45">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{apt.doctor.pharmacy.name}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        {canCancel ? (
          <button
            onClick={() => onCancel(apt.id)}
            disabled={cancelling}
            className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        ) : <span />}
        <Link
          to={`/appointments/${apt.id}`}
          className="flex items-center gap-1 text-xs font-medium text-ink/50 hover:text-rx transition-colors"
        >
          View details
          <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}

// ── AppointmentsPage ───────────────────────────────────────────────────────

type Tab = 'upcoming' | 'past'

export default function AppointmentsPage() {
  const [tab, setTab]             = useState<Tab>('upcoming')
  const [cancellingId, setCId]    = useState<string | null>(null)
  const { accessToken }           = useAuthStore()
  const queryClient               = useQueryClient()

  // Real-time status updates via Socket.io
  useEffect(() => {
    if (!accessToken) return
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'
    const socket    = io(`${socketUrl}/customer`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    })

    socket.on('appointment:status_updated', (data: { appointmentId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment', data.appointmentId] })
    })

    return () => { socket.disconnect() }
  }, [accessToken, queryClient])

  const { data: allApts, isLoading } = useQuery<AptItem[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments?limit=100&sortOrder=asc')
      return res.data.data as AptItem[]
    },
    staleTime: 30_000,
  })

  const upcoming = (allApts ?? [])
    .filter((a) => UPCOMING_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

  const past = (allApts ?? [])
    .filter((a) => PAST_STATUSES.includes(a.status))
    .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/appointments/${id}/cancel`)
    },
    onMutate:   (id) => setCId(id),
    onSettled:  () => setCId(null),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  function handleCancel(id: string) {
    if (!window.confirm('Cancel this appointment?')) return
    cancelMutation.mutate(id)
  }

  const items = tab === 'upcoming' ? upcoming : past

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-sm border-b border-line px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-medium text-ink">Appointments</h1>
            <Link
              to="/doctors"
              className="inline-flex items-center h-8 rounded-md bg-ink px-3 text-xs font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors"
            >
              Book new
            </Link>
          </div>
          <div className="flex">
            {(['upcoming', 'past'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-10 px-4 text-sm font-medium capitalize transition-colors border-b-2 ${
                  tab === t
                    ? 'text-ink border-ink'
                    : 'text-ink/40 border-transparent hover:text-ink/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {isLoading && (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-paper border border-line animate-pulse" />
            ))
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mist mb-4">
                <Calendar size={24} className="text-ink/30" />
              </div>
              <p className="text-ink/50 text-sm">
                {tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
              </p>
              {tab === 'upcoming' && (
                <Link
                  to="/doctors"
                  className="mt-4 inline-flex items-center gap-2 h-10 rounded-md border border-line px-5 text-sm font-medium text-ink hover:bg-paper transition-colors"
                >
                  Find a doctor
                </Link>
              )}
            </div>
          )}

          {!isLoading && items.map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              onCancel={handleCancel}
              cancelling={cancellingId === apt.id}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
