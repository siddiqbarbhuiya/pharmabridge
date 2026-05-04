import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  ChevronRight,
  ImageIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '../../components/PageTransition'
import { useCartStore } from '../../stores/cartStore'
import { api } from '../../lib/axios'
import { INDIA_STATES } from '@pharmabridge/types'

// ── Types ──────────────────────────────────────────────────────────────────

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

interface Prescription {
  id: string
  imageUrl: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'COD'
type Step = 1 | 2 | 3

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open: () => void }
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'UPI',        label: 'UPI',              icon: <Smartphone size={16} /> },
  { value: 'CARD',       label: 'Credit / Debit card', icon: <CreditCard size={16} /> },
  { value: 'NETBANKING', label: 'Net banking',       icon: <Banknote size={16} /> },
  { value: 'WALLET',     label: 'Wallet',            icon: <Wallet size={16} /> },
  { value: 'COD',        label: 'Cash on delivery',  icon: <Banknote size={16} /> },
]

const DELIVERY_THRESHOLD = 500
const DELIVERY_FEE       = 40

// ── AddressForm ────────────────────────────────────────────────────────────

interface AddressFormData {
  line1: string; line2: string; city: string
  district: string; state: string; pincode: string; landmark: string
}

function AddressForm({ onSaved }: { onSaved: (addr: AddressRecord) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<AddressFormData>({
    line1: '', line2: '', city: '', district: '', state: '', pincode: '', landmark: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        line1: form.line1, city: form.city, state: form.state, pincode: form.pincode,
        ...(form.line2     ? { line2:     form.line2     } : {}),
        ...(form.district  ? { district:  form.district  } : {}),
        ...(form.landmark  ? { landmark:  form.landmark  } : {}),
      }
      const res = await api.post('/users/addresses', body)
      return res.data.data as AddressRecord
    },
    onSuccess: (addr) => {
      qc.invalidateQueries({ queryKey: ['addresses'] })
      onSaved(addr)
    },
    onError: () => setError('Failed to save address. Please check all fields.'),
  })

  const set = (k: keyof AddressFormData, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="mt-4 p-4 bg-bone rounded-xl border border-line space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input
            placeholder="Address line 1 *"
            value={form.line1}
            onChange={(e) => set('line1', e.target.value)}
            className="w-full h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
          />
        </div>
        <div className="col-span-2">
          <input
            placeholder="Address line 2 (optional)"
            value={form.line2}
            onChange={(e) => set('line2', e.target.value)}
            className="w-full h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
          />
        </div>
        <input
          placeholder="City *"
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
          className="h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
        />
        <input
          placeholder="District"
          value={form.district}
          onChange={(e) => set('district', e.target.value)}
          className="h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
        />
        <select
          value={form.state}
          onChange={(e) => set('state', e.target.value)}
          className="h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink outline-none focus:border-brand-indigo transition-colors"
        >
          <option value="">State *</option>
          {INDIA_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          placeholder="Pincode *"
          inputMode="numeric"
          maxLength={6}
          value={form.pincode}
          onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
          className="h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
        />
        <div className="col-span-2">
          <input
            placeholder="Landmark (optional)"
            value={form.landmark}
            onChange={(e) => set('landmark', e.target.value)}
            className="w-full h-10 border border-line rounded-md px-3 text-sm bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
          />
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={!form.line1 || !form.city || !form.state || form.pincode.length !== 6 || mutation.isPending}
        className="w-full h-10 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-40"
      >
        {mutation.isPending ? 'Saving…' : 'Save address'}
      </button>
    </div>
  )
}

// ── ProgressBar ────────────────────────────────────────────────────────────

function ProgressBar({ step, needsPrescription }: { step: Step; needsPrescription: boolean }) {
  const steps = needsPrescription
    ? ['Address', 'Prescription', 'Payment']
    : ['Address', 'Payment']
  const activeIdx = needsPrescription ? step - 1 : step === 1 ? 0 : 1

  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < activeIdx
                  ? 'bg-rx text-white'
                  : i === activeIdx
                  ? 'bg-ink text-paper'
                  : 'bg-bone border border-line text-ink/30'
              }`}
            >
              {i < activeIdx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                i === activeIdx ? 'text-ink' : 'text-ink/30'
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-2 mb-4 transition-colors ${
                i < activeIdx ? 'bg-rx' : 'bg-line'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── CheckoutPage ───────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, pharmacyId, total, requiresPrescription, clear } = useCartStore()
  const needsRx = requiresPrescription()

  const subtotal    = total()
  const deliveryFee = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const grandTotal  = subtotal + deliveryFee

  const [step, setStep]               = useState<Step>(1)
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress]   = useState(0)
  const [isUploading, setIsUploading]         = useState(false)
  const [uploadError, setUploadError]         = useState('')
  const [paymentMethod, setPaymentMethod]     = useState<PaymentMethod>('UPI')
  const [isPlacingOrder, setIsPlacingOrder]   = useState(false)
  const [orderError, setOrderError]           = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const isDragging = useRef(false)

  // Redirect to search if cart is empty
  useEffect(() => {
    if (items.length === 0) navigate('/search', { replace: true })
  }, [items.length, navigate])

  // ── Address query ──────────────────────────────────────────────────────
  const { data: addresses = [], isLoading: addrLoading } = useQuery<AddressRecord[]>({
    queryKey: ['addresses'],
    queryFn:  async () => {
      const res = await api.get('/users/addresses')
      return res.data.data as AddressRecord[]
    },
  })

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddr) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0]
      setSelectedAddr(def.id)
    }
  }, [addresses, selectedAddr])

  // ── Saved prescriptions query ──────────────────────────────────────────
  const { data: savedPrescriptions = [] } = useQuery<Prescription[]>({
    queryKey: ['prescriptions', 'APPROVED'],
    queryFn:  async () => {
      const res = await api.get('/prescriptions?status=APPROVED&limit=10')
      return res.data.data as Prescription[]
    },
    enabled: needsRx,
  })

  // ── Upload prescription ────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed (JPG, PNG, WEBP)')
      return
    }
    setUploadError('')
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const { data: params } = await api.post('/prescriptions/upload', {
        folder:   'prescriptions',
        fileType: file.type,
      })
      const { uploadUrl, publicId, signature, timestamp, apiKey } = params.data

      const formData = new FormData()
      formData.append('file', file)
      formData.append('public_id', publicId)
      formData.append('signature', signature)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', apiKey)

      const secureUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', uploadUrl)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText).secure_url as string)
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(formData)
      })

      setPrescriptionUrl(secureUrl)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Place order ────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!selectedAddr || !pharmacyId) return
    setIsPlacingOrder(true)
    setOrderError('')

    try {
      const { data: orderRes } = await api.post('/orders', {
        pharmacyId,
        addressId:       selectedAddr,
        items:           items.map((i) => ({ medicineId: i.medicine.id, quantity: i.quantity })),
        paymentMethod,
        ...(prescriptionUrl ? { prescriptionUrl } : {}),
      })

      const order = orderRes.data
      clear()

      if (paymentMethod === 'COD') {
        navigate(`/orders/${order.id}/confirmed`)
        return
      }

      // ── Online payment via Razorpay ────────────────────────────────────
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Payment gateway unavailable. Please try COD.')

      const { data: rzpRes } = await api.post('/payments/create-order', { orderId: order.id })
      const rzpData = rzpRes.data

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:           rzpData.key,
          amount:        rzpData.amount,
          currency:      rzpData.currency,
          order_id:      rzpData.razorpayOrderId,
          name:          'PharmaBridge',
          description:   `Order ${rzpData.orderNumber}`,
          theme:         { color: '#0E7C66' },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await api.post('/payments/verify', {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                orderId:             order.id,
              })
              resolve()
            } catch {
              reject(new Error('Payment verification failed'))
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        })
        rzp.open()
      })

      navigate(`/orders/${order.id}/confirmed`)
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // ── Next step helper ───────────────────────────────────────────────────
  const nextStep = () => {
    if (step === 1) setStep(needsRx ? 2 : 3)
    else if (step === 2) setStep(3)
  }

  if (items.length === 0) return null

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone pb-16">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-paper transition-colors"
            >
              <ArrowLeft size={18} className="text-ink/60" />
            </button>
            <span className="text-sm font-medium text-ink">Checkout</span>
          </div>
          <div className="px-4 pb-4">
            <ProgressBar step={step} needsPrescription={needsRx} />
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

          {/* ── STEP 1: Address ─────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-lg font-medium text-ink mb-4">Delivery address</h2>

              {addrLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-paper border border-line animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedAddr(addr.id)}
                      className={`w-full text-left flex items-start gap-3 rounded-xl border px-4 py-4 transition-colors ${
                        selectedAddr === addr.id
                          ? 'border-ink bg-paper'
                          : 'border-line bg-paper hover:border-ink/30'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedAddr === addr.id ? 'border-ink' : 'border-line'
                      }`}>
                        {selectedAddr === addr.id && (
                          <div className="w-2 h-2 rounded-full bg-ink" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-ink/40 shrink-0" />
                          <p className="text-sm font-medium text-ink truncate">
                            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                          </p>
                          {addr.isDefault && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-mint text-rx border border-rx/20 shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/50 mt-0.5 pl-4">
                          {addr.city}, {addr.state} – {addr.pincode}
                        </p>
                        {addr.landmark && (
                          <p className="text-xs text-ink/40 mt-0.5 pl-4">Near {addr.landmark}</p>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Add new address */}
                  <button
                    onClick={() => setShowAddForm((v) => !v)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-line hover:border-ink/30 text-sm text-ink/50 hover:text-ink transition-colors"
                  >
                    <Plus size={14} />
                    Add new address
                  </button>

                  {showAddForm && (
                    <AddressForm
                      onSaved={(addr) => {
                        setSelectedAddr(addr.id)
                        setShowAddForm(false)
                      }}
                    />
                  )}
                </div>
              )}

              <button
                onClick={nextStep}
                disabled={!selectedAddr}
                className="w-full mt-4 flex items-center justify-center gap-2 h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors disabled:opacity-40"
              >
                Continue
                <ChevronRight size={15} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Prescription ────────────────────────────────── */}
          {step === 2 && needsRx && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-lg font-medium text-ink mb-1">Prescription required</h2>
              <p className="text-sm text-ink/50 mb-4">
                One or more medicines in your cart require a valid prescription.
              </p>

              {/* Rx items list */}
              <div className="bg-paper border border-line rounded-xl divide-y divide-line mb-5">
                {items.filter((i) => i.medicine.isPrescriptionRequired).map((item) => (
                  <div key={item.medicine.id} className="flex items-center gap-3 px-4 py-3">
                    <AlertCircle size={14} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{item.medicine.name}</p>
                      <p className="text-xs text-ink/40">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload zone */}
              {!prescriptionUrl && (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); isDragging.current = true }}
                  onDrop={(e) => {
                    e.preventDefault()
                    isDragging.current = false
                    const file = e.dataTransfer.files[0]
                    if (file) uploadFile(file)
                  }}
                  className="border-2 border-dashed border-line rounded-xl p-8 text-center cursor-pointer hover:border-ink/30 transition-colors group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center group-hover:bg-bone transition-colors">
                      <Upload size={20} className="text-ink/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">Upload prescription</p>
                      <p className="text-xs text-ink/40 mt-1">
                        Drag & drop or tap to select · JPG, PNG, WEBP
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadFile(file)
                    }}
                  />
                </div>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-ink/50">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-bone rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rx rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload error */}
              {uploadError && (
                <p className="mt-3 text-xs text-danger">{uploadError}</p>
              )}

              {/* Uploaded preview */}
              {prescriptionUrl && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-line">
                  <img
                    src={prescriptionUrl}
                    alt="Prescription"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-0 inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-white text-xs font-medium">Prescription uploaded</span>
                    </div>
                    <button
                      onClick={() => setPrescriptionUrl(null)}
                      className="text-white/70 hover:text-white text-xs underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Saved prescriptions */}
              {savedPrescriptions.length > 0 && !prescriptionUrl && (
                <div className="mt-5">
                  <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-3">
                    Or use a saved prescription
                  </p>
                  <div className="space-y-2">
                    {savedPrescriptions.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPrescriptionUrl(p.imageUrl)}
                        className="w-full flex items-center gap-3 bg-paper border border-line rounded-xl px-4 py-3 hover:border-ink/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-mist shrink-0">
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-ink">Prescription</p>
                          <p className="text-xs text-ink/40">
                            {new Date(p.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <ImageIcon size={14} className="text-ink/30" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={nextStep}
                disabled={!prescriptionUrl}
                className="w-full mt-5 flex items-center justify-center gap-2 h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors disabled:opacity-40"
              >
                Continue
                <ChevronRight size={15} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 3: Payment ──────────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-medium text-ink">Payment</h2>

              {/* Order summary */}
              <div className="bg-paper border border-line rounded-2xl p-5">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-3">
                  Order summary
                </p>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.medicine.id} className="flex justify-between text-sm">
                      <span className="text-ink/70 truncate max-w-[60%]">
                        {item.medicine.name}
                        <span className="text-ink/40 ml-1">× {item.quantity}</span>
                      </span>
                      <span className="text-ink font-medium shrink-0">
                        ₹{(item.medicine.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                  <div className="flex justify-between text-sm text-ink/60">
                    <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink/60">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-rx' : ''}>
                      {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-line">
                    <span>Total</span><span>₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-paper border border-line rounded-2xl p-5">
                <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-3">
                  Payment method
                </p>
                <div className="space-y-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        paymentMethod === opt.value
                          ? 'border-ink bg-bone'
                          : 'border-line hover:border-ink/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === opt.value ? 'border-ink' : 'border-line'
                      }`}>
                        {paymentMethod === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-ink" />
                        )}
                      </div>
                      <span className="text-ink/60">{opt.icon}</span>
                      <span className="text-sm text-ink">{opt.label}</span>
                      {opt.value === 'UPI' && (
                        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-rx bg-mint border border-rx/20 px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {orderError && (
                <div className="flex items-start gap-2 text-sm text-danger bg-blush border border-danger/20 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{orderError}</span>
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={isPlacingOrder}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {isPlacingOrder
                  ? 'Processing…'
                  : paymentMethod === 'COD'
                  ? 'Place Order'
                  : `Pay ₹${grandTotal.toFixed(0)}`}
              </button>
            </motion.div>
          )}

        </div>
      </div>
    </PageTransition>
  )
}
