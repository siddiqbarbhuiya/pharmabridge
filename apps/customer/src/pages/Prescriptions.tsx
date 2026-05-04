import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Upload, X, CheckCircle, Clock, XCircle, ZoomIn } from 'lucide-react'
import { io } from 'socket.io-client'
import { PageTransition } from '../components/PageTransition'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

type RxStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface Prescription {
  id: string
  imageUrl: string
  status: RxStatus
  note: string | null
  orderId: string | null
  createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RxStatus, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock        },
  APPROVED: { label: 'Approved', cls: 'bg-mint text-rx border-rx/20',               icon: CheckCircle  },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-500 border-red-200',      icon: XCircle      },
}

// ── UploadSheet ────────────────────────────────────────────────────────────

function UploadSheet({
  onClose,
  onSuccess,
}: {
  onClose:   () => void
  onSuccess: () => void
}) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)
  const queryClient             = useQueryClient()

  function pickFile(f: File) {
    if (!f.type.startsWith('image/')) {
      setError('Only image files are allowed (JPEG, PNG, WebP)')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB')
      return
    }
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      // Step 1: get signed upload params
      const { data: signedData } = await api.post('/prescriptions/upload', {
        folder:   'prescriptions',
        fileType: file.type,
      })
      const { uploadUrl, publicId, signature } = signedData.data

      // Step 2: XHR upload to Cloudinary (for progress)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('public_id', publicId)
      formData.append('signature', signature)
      formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY ?? '')

      const secureUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', uploadUrl)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90))
        }
        xhr.onload = () => {
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText)
            setProgress(100)
            resolve(res.secure_url as string)
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(formData)
      })

      // Step 3: save prescription record
      await api.post('/prescriptions', { imageUrl: secureUrl })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      onSuccess()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-ink">Upload Prescription</h2>
          <button onClick={onClose} className="text-ink/30 hover:text-ink/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Drop zone */}
        {!file ? (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-line rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-ink/30 hover:bg-bone/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center">
              <Upload size={20} className="text-ink/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-ink">Tap to choose a file</p>
              <p className="text-xs text-ink/40 mt-1">JPEG, PNG or WebP · max 5 MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
            />
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-line mb-4">
            <img src={preview!} alt="Preview" className="w-full h-48 object-cover" />
            {!uploading && (
              <button
                onClick={() => { setFile(null); setPreview(null); setProgress(0) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/60 flex items-center justify-center text-paper hover:bg-ink transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Progress */}
        {uploading && progress > 0 && (
          <div className="mb-4">
            <div className="h-1.5 bg-bone rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-rx rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-ink/40 text-right mt-1">{progress}%</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full h-11 rounded-lg bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors disabled:opacity-40"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-paper/10 flex items-center justify-center text-paper hover:bg-paper/20 transition-colors">
        <X size={18} />
      </button>
      <motion.img
        src={url}
        alt="Prescription"
        className="max-w-full max-h-full object-contain rounded-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  )
}

// ── PrescriptionsPage ──────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const { accessToken }     = useAuthStore()
  const queryClient         = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [lightbox, setLightbox]     = useState<string | null>(null)

  // Real-time prescription status updates
  useEffect(() => {
    if (!accessToken) return
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'
    const socket    = io(`${socketUrl}/customer`, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socket.on('prescription:status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
    })
    return () => { socket.disconnect() }
  }, [accessToken, queryClient])

  const { data, isLoading } = useQuery<Prescription[]>({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const res = await api.get('/prescriptions?limit=50')
      return res.data.data as Prescription[]
    },
    staleTime: 60_000,
  })

  const prescriptions = data ?? []

  return (
    <PageTransition>
      <div className="min-h-screen bg-bone">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur-sm border-b border-line px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium text-ink">Prescriptions</h1>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 h-8 rounded-md bg-ink px-3 text-xs font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors"
            >
              <Upload size={13} />
              Upload
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-paper border border-line animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && prescriptions.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mist mb-4">
                <FileText size={24} className="text-ink/30" />
              </div>
              <p className="text-ink/50 text-sm mb-4">No prescriptions uploaded yet</p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 h-10 rounded-md border border-line px-5 text-sm font-medium text-ink hover:bg-paper transition-colors"
              >
                <Upload size={14} />
                Upload your first prescription
              </button>
            </div>
          )}

          {!isLoading && prescriptions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {prescriptions.map((rx) => {
                const status = STATUS_CONFIG[rx.status]
                const Icon   = status.icon

                return (
                  <button
                    key={rx.id}
                    onClick={() => setLightbox(rx.imageUrl)}
                    className="relative group rounded-2xl overflow-hidden border border-line bg-paper aspect-square focus:outline-none"
                  >
                    <img
                      src={rx.imageUrl}
                      alt="Prescription"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center">
                      <ZoomIn size={24} className="text-paper opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Status badge */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${status.cls}`}>
                        <Icon size={10} />
                        {status.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <UploadSheet
            onClose={() => setShowUpload(false)}
            onSuccess={() => setShowUpload(false)}
          />
        )}
        {lightbox && (
          <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
