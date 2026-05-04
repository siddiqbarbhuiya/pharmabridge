import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  User, Edit2, Check, MapPin, Bell, BellOff, LogOut,
  Plus, Star, Trash2, X, ChevronRight,
} from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/authStore'
import { INDIA_STATES } from '@pharmabridge/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  phone: string
  name: string | null
  email: string | null
  role: string
  createdAt: string
}

interface AddressRecord {
  id: string
  line1: string
  line2: string | null
  city: string
  district: string | null
  state: string
  pincode: string
  landmark: string | null
  isDefault: boolean
}

// ── AddressForm ────────────────────────────────────────────────────────────

interface AddressFormData {
  line1: string; line2: string; city: string; state: string
  pincode: string; landmark: string; isDefault: boolean
}

const EMPTY_FORM: AddressFormData = {
  line1: '', line2: '', city: '', state: '', pincode: '', landmark: '', isDefault: false,
}

function AddressModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: AddressRecord
  onClose:  () => void
  onSaved:  () => void
}) {
  const [form, setForm] = useState<AddressFormData>(
    existing
      ? { line1: existing.line1, line2: existing.line2 ?? '', city: existing.city,
          state: existing.state, pincode: existing.pincode,
          landmark: existing.landmark ?? '', isDefault: existing.isDefault }
      : EMPTY_FORM
  )
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        line1:     form.line1,
        city:      form.city,
        state:     form.state,
        pincode:   form.pincode,
        ...(form.line2    ? { line2: form.line2 }       : {}),
        ...(form.landmark ? { landmark: form.landmark } : {}),
        isDefault: form.isDefault,
      }
      if (existing) {
        await api.patch(`/users/addresses/${existing.id}`, body)
      } else {
        await api.post('/users/addresses', body)
      }
    },
    onSuccess:  onSaved,
    onError:    () => setError('Failed to save address. Please check all fields.'),
  })

  function validate() {
    if (!form.line1.trim()) return 'Address line 1 is required'
    if (!form.city.trim())  return 'City is required'
    if (!form.state)        return 'State is required'
    if (!/^\d{6}$/.test(form.pincode)) return 'Pincode must be 6 digits'
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    saveMutation.mutate()
  }

  const field = (
    label: string,
    key: keyof Omit<AddressFormData, 'isDefault'>,
    opts?: { required?: boolean; placeholder?: string }
  ) => (
    <div>
      <label className="block text-xs text-ink/50 mb-1">{label}{opts?.required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type="text"
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full bg-bone border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors"
      />
    </div>
  )

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-sm bg-paper rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-paper border-b border-line">
          <h2 className="text-base font-medium text-ink">{existing ? 'Edit Address' : 'Add Address'}</h2>
          <button onClick={onClose} className="text-ink/30 hover:text-ink/60 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {field('Address Line 1', 'line1', { required: true, placeholder: 'Flat, Building, Street' })}
          {field('Address Line 2', 'line2', { placeholder: 'Area, Locality (optional)' })}

          <div className="grid grid-cols-2 gap-3">
            {field('City', 'city', { required: true })}
            {field('Pincode', 'pincode', { required: true, placeholder: '6 digits' })}
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">State<span className="text-red-500 ml-0.5">*</span></label>
            <select
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className="w-full bg-bone border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-ink/30 transition-colors"
            >
              <option value="">Select state</option>
              {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {field('Landmark', 'landmark', { placeholder: 'Near landmark (optional)' })}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="rounded border-line text-rx"
            />
            <span className="text-sm text-ink/70">Set as default address</span>
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full h-11 rounded-lg bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors disabled:opacity-40 mt-2"
          >
            {saveMutation.isPending ? 'Saving…' : existing ? 'Save Changes' : 'Add Address'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── ProfilePage ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate                = useNavigate()
  const { user: authUser, logout, setAuth, accessToken } = useAuthStore()
  const queryClient             = useQueryClient()

  const [editingProfile, setEditingProfile] = useState(false)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [addressModal, setAddressModal] = useState<{ open: boolean; existing?: AddressRecord }>({ open: false })

  const notifKey = 'pb-notif-enabled'
  const [notifEnabled, setNotifEnabled] = useState<boolean>(
    () => localStorage.getItem(notifKey) !== 'false'
  )

  // Fetch full profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/users/me')
      return res.data.data as UserProfile
    },
    staleTime: 60_000,
  })

  // Seed edit fields when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setEmail(profile.email ?? '')
    }
  }, [profile])

  // Fetch addresses
  const { data: addresses } = useQuery<AddressRecord[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await api.get('/users/addresses')
      return res.data.data as AddressRecord[]
    },
    staleTime: 60_000,
  })

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {}
      if (name.trim())  body.name = name.trim()
      if (email.trim()) body.email = email.trim()
      const res = await api.patch('/users/me', body)
      return res.data.data as UserProfile
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Sync auth store name so the avatar initials update immediately
      if (authUser && accessToken) {
        setAuth({ ...authUser, name: updated.name }, accessToken)
      }
      setEditingProfile(false)
      setProfileError(null)
    },
    onError: () => setProfileError('Failed to update profile. Please try again.'),
  })

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/addresses/${id}`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })

  // Set default address mutation
  const defaultAddressMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/addresses/${id}/default`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })

  function handleLogout() {
    logout()
    navigate('/auth/login', { replace: true })
  }

  function toggleNotif() {
    const next = !notifEnabled
    setNotifEnabled(next)
    localStorage.setItem(notifKey, String(next))
  }

  const displayName = profile?.name ?? authUser?.name
  const initials    = displayName
    ? displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : (authUser?.phone?.slice(-2) ?? 'PB')

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">

        {/* Header */}
        <div className="bg-bone/90 backdrop-blur-sm border-b border-line px-4 py-4 sticky top-0 z-10">
          <h1 className="text-lg font-medium text-ink">Profile</h1>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ── Avatar + name ── */}
          <div className="bg-paper border border-line rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center shrink-0">
                <span className="text-xl font-medium text-paper select-none">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-ink truncate">
                  {displayName ?? 'Set your name'}
                </p>
                <p className="text-sm text-ink/50 mt-0.5">+91 {authUser?.phone}</p>
                {profile?.email && (
                  <p className="text-xs text-ink/40 mt-0.5 truncate">{profile.email}</p>
                )}
              </div>
              <button
                onClick={() => setEditingProfile((v) => !v)}
                className="shrink-0 w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink/50 hover:text-ink hover:border-ink/30 transition-colors"
              >
                {editingProfile ? <X size={14} /> : <Edit2 size={14} />}
              </button>
            </div>

            {/* Edit form */}
            <AnimatePresence>
              {editingProfile && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-line space-y-3">
                    <div>
                      <label className="block text-xs text-ink/50 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-bone border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink/50 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-bone border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-ink/30 transition-colors"
                      />
                    </div>
                    {profileError && <p className="text-xs text-red-500">{profileError}</p>}
                    <button
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2 h-9 px-4 rounded-lg bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
                    >
                      <Check size={14} />
                      {updateMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Saved Addresses ── */}
          <div className="bg-paper border border-line rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-ink/50" />
                <p className="text-sm font-medium text-ink">Saved Addresses</p>
              </div>
              <button
                onClick={() => setAddressModal({ open: true })}
                className="flex items-center gap-1 text-xs font-medium text-ink/50 hover:text-rx transition-colors"
              >
                <Plus size={13} />
                Add new
              </button>
            </div>

            {(!addresses || addresses.length === 0) && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-ink/40">No saved addresses</p>
              </div>
            )}

            {addresses?.map((addr, i) => (
              <div
                key={addr.id}
                className={`px-5 py-4 flex items-start gap-3 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  addr.isDefault ? 'border-rx bg-mint' : 'border-line'
                }`}>
                  {addr.isDefault && <div className="w-2 h-2 rounded-full bg-rx" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {addr.city}, {addr.state} — {addr.pincode}
                  </p>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs text-rx mt-1">
                      <Star size={10} fill="currentColor" />
                      Default
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => defaultAddressMutation.mutate(addr.id)}
                      className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-ink/40 hover:text-rx hover:border-rx/30 transition-colors"
                      title="Set as default"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setAddressModal({ open: true, existing: addr })}
                    className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-ink/40 hover:text-ink hover:border-ink/30 transition-colors"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this address?')) {
                        deleteAddressMutation.mutate(addr.id)
                      }
                    }}
                    className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-ink/40 hover:text-red-500 hover:border-red-200 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Notifications ── */}
          <div className="bg-paper border border-line rounded-2xl px-5 py-4">
            <button
              onClick={toggleNotif}
              className="w-full flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {notifEnabled
                  ? <Bell size={16} className="text-rx" />
                  : <BellOff size={16} className="text-ink/40" />
                }
                <div className="text-left">
                  <p className="text-sm font-medium text-ink">Push Notifications</p>
                  <p className="text-xs text-ink/40 mt-0.5">
                    {notifEnabled ? 'Enabled — order and appointment alerts' : 'Disabled'}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                notifEnabled ? 'bg-rx' : 'bg-line'
              }`}>
                <motion.div
                  className="w-5 h-5 rounded-full bg-paper shadow-sm"
                  animate={{ x: notifEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </button>
          </div>

          {/* ── Logout ── */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-5 py-4 bg-paper border border-line rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut size={16} />
              Sign out
            </div>
            <ChevronRight size={14} className="text-red-400" />
          </button>

        </div>
      </div>

      {/* Address modal */}
      <AnimatePresence>
        {addressModal.open && (
          <AddressModal
            existing={addressModal.existing}
            onClose={() => setAddressModal({ open: false })}
            onSaved={() => {
              setAddressModal({ open: false })
              queryClient.invalidateQueries({ queryKey: ['addresses'] })
            }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
