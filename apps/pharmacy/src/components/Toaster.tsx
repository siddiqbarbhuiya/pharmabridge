import { useToastStore } from '../stores/toastStore'

export function Toaster() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto cursor-pointer transition-all ${
            t.type === 'success' ? 'bg-ink text-paper'
            : t.type === 'error' ? 'bg-red-600 text-paper'
            : 'bg-paper border border-line text-ink'
          }`}
        >
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
