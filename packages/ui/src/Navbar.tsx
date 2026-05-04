import { useState, type ReactNode } from 'react'

interface NavbarProps {
  logo?: ReactNode
  /** Center navigation links — shown on md+ screens only */
  nav?: ReactNode
  /** Right-side actions (Sign in button, etc.) — shown on md+ screens */
  children?: ReactNode
  /** Content to render inside the mobile drawer (defaults to `children` if omitted) */
  mobileMenu?: ReactNode
  className?: string
}

export function Navbar({ logo, nav, children, mobileMenu, className = '' }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const hasMobile = mobileMenu != null || children != null || nav != null

  return (
    <>
      <nav
        className={`sticky top-0 z-50 h-[72px] glass border-b border-line px-6 flex items-center gap-4 ${className}`}
      >
        {/* Logo */}
        {logo && <div className="flex-shrink-0">{logo}</div>}

        {/* Center nav — desktop only */}
        {nav && <div className="hidden md:flex flex-1 items-center justify-center gap-1">{nav}</div>}

        {/* Spacer when no center nav */}
        {!nav && <div className="flex-1" />}

        {/* Right-side actions — desktop only */}
        {children && (
          <div className="hidden md:flex items-center gap-2">{children}</div>
        )}

        {/* Hamburger — mobile only */}
        {hasMobile && (
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-ink/60 hover:text-ink hover:bg-bone transition-all duration-150"
          >
            {open ? (
              /* × close */
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l14 14M16 2L2 16" />
              </svg>
            ) : (
              /* ☰ hamburger */
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 1h16M1 7h16M1 13h16" />
              </svg>
            )}
          </button>
        )}
      </nav>

      {/* Mobile drawer */}
      <div
        aria-hidden={!open}
        className={`md:hidden fixed inset-x-0 top-[72px] z-40 bg-paper border-b border-line shadow-card
          transition-all duration-200 ease-out
          ${open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
      >
        <div className="px-6 py-4 flex flex-col gap-1">
          {mobileMenu ?? (
            <>
              {nav}
              {children}
            </>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 top-[72px] z-30 bg-ink/10"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

/* ─── NavbarLogo ────────────────────────────────────────────────────── */

interface NavbarLogoProps {
  href?: string
}

export function NavbarLogo({ href = '/' }: NavbarLogoProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 group"
      aria-label="PharmaBridge home"
    >
      {/* Tiny brand orb */}
      <span
        className="w-5 h-5 rounded-full flex-shrink-0 animate-orb-spin"
        style={{ background: 'conic-gradient(from 220deg, #5b5bff, #8a6bff, #ff6a4d, #7bc8ff, #5b5bff)' }}
        aria-hidden="true"
      />
      <span className="font-display font-medium text-ink text-xl leading-none tracking-tight">
        PharmaBridge
      </span>
    </a>
  )
}

/* ─── NavLink ────────────────────────────────────────────────────────── */

interface NavLinkProps {
  href?: string
  active?: boolean
  children: ReactNode
  className?: string
}

export function NavLink({ href = '#', active, children, className = '' }: NavLinkProps) {
  return (
    <a
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
        ${active ? 'text-ink bg-bone' : 'text-ink/60 hover:text-ink hover:bg-bone'}
        ${className}`}
    >
      {children}
    </a>
  )
}
