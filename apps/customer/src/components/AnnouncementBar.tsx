import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const messages = [
  { text: '⚡ Same-day delivery now live in 12 new cities', href: '#' },
  { text: '🔒 All pharmacies verified by licensed pharmacists', href: '#' },
  { text: '💊 Upload prescriptions and order in under 2 minutes', href: '#' },
]

export function AnnouncementBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const msg = messages[index]

  return (
    <div className="bg-ink text-paper h-10 flex items-center justify-center px-4 text-xs font-medium overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.a
          key={index}
          href={msg.href}
          className="flex items-center gap-1.5 hover:underline underline-offset-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {msg.text}
          <ArrowRight size={12} />
        </motion.a>
      </AnimatePresence>
    </div>
  )
}
