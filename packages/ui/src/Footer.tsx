import type { ReactNode } from 'react'

/* ─── Footer (shell) ────────────────────────────────────────────────
   CRITICAL: The watermark wordmark is mandatory brand texture.
   Never remove. The oversized "PharmaBridge" sits behind all content
   at 4% opacity, anchored to the bottom of the footer.
   ─────────────────────────────────────────────────────────────────── */

interface FooterProps {
  children: ReactNode
  className?: string
}

export function Footer({ children, className = '' }: FooterProps) {
  return (
    <footer className={`relative overflow-hidden bg-ink ${className}`}>
      {/* ── WATERMARK — mandatory, do not remove ── */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 flex items-end justify-center pb-1 overflow-hidden"
      >
        <span
          className="font-display font-medium text-paper whitespace-nowrap leading-none tracking-tight"
          style={{ fontSize: 'clamp(5rem, 14vw, 13rem)', opacity: 0.04 }}
        >
          PHARMABRIDGE
        </span>
      </span>

      {/* Content sits above watermark */}
      <div className="relative z-10">{children}</div>
    </footer>
  )
}

/* ─── FooterContent ─────────────────────────────────────────────────
   Standard inner wrapper — centers content, sets vertical padding.
   ─────────────────────────────────────────────────────────────────── */

interface FooterContentProps {
  children: ReactNode
  className?: string
}

export function FooterContent({ children, className = '' }: FooterContentProps) {
  return (
    <div className={`max-w-[1280px] mx-auto px-6 py-16 ${className}`}>
      {children}
    </div>
  )
}

/* ─── FooterColumns ─────────────────────────────────────────────────
   4-column link grid. Pass a plain object: { Heading: ['Link', ...] }
   ─────────────────────────────────────────────────────────────────── */

interface FooterColumnsProps {
  columns: Record<string, string[]>
  getHref?: (label: string) => string
}

export function FooterColumns({ columns, getHref = () => '#' }: FooterColumnsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {Object.entries(columns).map(([heading, links]) => (
        <div key={heading}>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/30 mb-4">
            {heading}
          </p>
          <ul className="space-y-2.5">
            {links.map((link) => (
              <li key={link}>
                <a
                  href={getHref(link)}
                  className="text-paper/50 hover:text-paper/80 text-sm transition-colors duration-150"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/* ─── FooterNewsletter ──────────────────────────────────────────────
   Optional newsletter row — sits below columns, above divider.
   ─────────────────────────────────────────────────────────────────── */

interface FooterNewsletterProps {
  onSubmit?: (email: string) => void
}

export function FooterNewsletter({ onSubmit }: FooterNewsletterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <p className="text-paper/50 text-sm flex-shrink-0">Stay in the loop:</p>
      <form
        className="flex gap-2 w-full sm:max-w-xs"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSubmit?.(fd.get('email') as string)
        }}
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="flex-1 bg-paper/5 border border-paper/10 rounded-md px-3 py-2 text-sm text-paper placeholder-paper/30 outline-none focus:border-brand-indigo transition-colors"
        />
        <button
          type="submit"
          className="flex-shrink-0 inline-flex items-center justify-center h-9 rounded-md bg-paper/10 hover:bg-paper/20 px-4 text-sm font-medium text-paper transition-colors"
        >
          Subscribe
        </button>
      </form>
    </div>
  )
}

/* ─── FooterBottom ──────────────────────────────────────────────────
   Copyright bar — sits at the very bottom of FooterContent.
   ─────────────────────────────────────────────────────────────────── */

interface FooterBottomProps {
  copyright?: string
  links?: Array<{ label: string; href?: string }>
}

export function FooterBottom({ copyright, links }: FooterBottomProps) {
  const year = new Date().getFullYear()
  return (
    <div className="border-t border-paper/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-paper/30 text-xs">
        {copyright ?? `© ${year} PharmaBridge. Your health. Delivered.`}
      </p>
      {links && links.length > 0 && (
        <nav className="flex gap-4">
          {links.map(({ label, href = '#' }) => (
            <a
              key={label}
              href={href}
              className="text-paper/30 hover:text-paper/60 text-xs transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}
