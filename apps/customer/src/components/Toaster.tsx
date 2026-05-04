import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={[
              'pointer-events-auto w-full max-w-sm flex items-start gap-3 rounded-xl px-4 py-3 shadow-card text-sm leading-5',
              t.type === 'error'   ? 'bg-danger text-white' :
              t.type === 'success' ? 'bg-rx    text-white'  :
                                     'bg-ink   text-paper',
            ].join(' ')}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 opacity-75 hover:opacity-100 transition-opacity mt-px"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
