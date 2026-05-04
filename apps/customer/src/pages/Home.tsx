import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Search, MapPin, Navigation, ArrowRight, ChevronRight } from 'lucide-react'
import {
  Navbar, NavbarLogo, NavLink,
  Footer, FooterContent, FooterColumns, FooterBottom,
  Heading, Text, Mono,
  Container, Section,
} from '@pharmabridge/ui'
import { PageTransition } from '../components/PageTransition'
import { AnnouncementBar } from '../components/AnnouncementBar'
import { useLocationStore } from '../stores/locationStore'
import { api } from '../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PromoCard {
  id: string
  type: 'BANNER' | 'OFFER' | 'HIGHLIGHT'
  badge?: string | null
  title: string
  subtitle?: string | null
  background: string
  imageUrl?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  tags?: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADIENTS: Record<string, string> = {
  blue:   'linear-gradient(135deg, #3B82F6, #6366F1)',
  green:  'linear-gradient(135deg, #10B981, #059669)',
  purple: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  orange: 'linear-gradient(135deg, #F97316, #EF4444)',
  dark:   'linear-gradient(135deg, #1E293B, #0F172A)',
  pink:   'linear-gradient(135deg, #EC4899, #DB2777)',
}

const CATEGORIES = [
  { label: 'Diabetes',    emoji: '💉', bg: 'bg-blush' },
  { label: 'Vitamins',    emoji: '💊', bg: 'bg-mint'  },
  { label: 'Heart Care',  emoji: '❤️',  bg: 'bg-blush' },
  { label: 'Pain Relief', emoji: '🩹', bg: 'bg-peach' },
  { label: 'Antibiotics', emoji: '🧬', bg: 'bg-mist'  },
  { label: 'Skin Care',   emoji: '✨', bg: 'bg-lilac' },
  { label: 'Baby Care',   emoji: '👶', bg: 'bg-sky'   },
  { label: 'Eye Care',    emoji: '👁️',  bg: 'bg-mist'  },
] as const

const FOOTER_LINKS = {
  Company:  ['About', 'Blog', 'Careers', 'Press'],
  Platform: ['For Pharmacies', 'API', 'Status'],
  Legal:    ['Privacy Policy', 'Terms of Service', 'Refund Policy'],
  Support:  ['Help Centre', 'Contact Us', 'Safety'],
}

const FEATURE_CARDS = [
  {
    tint: 'bg-mist',
    eyebrow: '↑ FASTER DELIVERY',
    headline: 'Medicine in 30–60 min',
    body: 'Local pharmacies fulfil your order the moment you place it. No warehouse delays.',
  },
  {
    tint: 'bg-blush',
    eyebrow: '↓ LOWER PRICES',
    headline: 'Retail price, every time',
    body: 'No platform markup. You pay the printed MRP — nothing more, nothing less.',
  },
  {
    tint: 'bg-peach',
    eyebrow: '↑ VERIFIED PHARMACIES',
    headline: 'Licensed & pharmacist-run',
    body: 'Every pharmacy on PharmaBridge is licensed by the State Drug Controller.',
  },
]

const SVG_GRID = `url("data:image/svg+xml,%3Csvg%20width%3D'40'%20height%3D'40'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%3E%3Cpath%20d%3D'M%2040%200%20L%200%200%200%2040'%20fill%3D'none'%20stroke%3D'%230A0A0B'%20stroke-width%3D'0.5'%2F%3E%3C%2Fsvg%3E")`

// ── PromoCardView ─────────────────────────────────────────────────────────────

function PromoCardView({ card }: { card: PromoCard }) {
  const navigate = useNavigate()
  const bg = GRADIENTS[card.background] ?? card.background ?? GRADIENTS.blue

  const handleCta = () => {
    if (!card.ctaUrl) return
    if (card.ctaUrl.startsWith('/')) navigate(card.ctaUrl)
    else window.open(card.ctaUrl, '_blank', 'noopener,noreferrer')
  }

  if (card.type === 'OFFER') {
    return (
      <div className="relative h-full w-full rounded-2xl overflow-hidden flex" style={{ background: bg }}>
        <div className="flex-[0_0_65%] p-6 flex flex-col justify-between">
          {card.badge && (
            <span className="self-start font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/15 text-white mb-3">
              {card.badge}
            </span>
          )}
          <div>
            <p className="text-white font-medium text-lg leading-snug mb-1.5">{card.title}</p>
            {card.subtitle && <p className="text-white/65 text-sm leading-relaxed">{card.subtitle}</p>}
          </div>
          {card.ctaLabel && (
            <button onClick={handleCta} className="self-start mt-4 text-xs px-4 py-1.5 rounded-full bg-white text-gray-900 font-medium hover:opacity-90 transition-opacity">
              {card.ctaLabel}
            </button>
          )}
        </div>
        <div className="flex-[0_0_35%] relative">
          {card.imageUrl
            ? <img src={card.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-white/10" />}
        </div>
      </div>
    )
  }

  if (card.type === 'HIGHLIGHT') {
    return (
      <div className="relative h-full w-full rounded-2xl overflow-hidden" style={{ background: card.imageUrl ? undefined : bg }}>
        {card.imageUrl && (
          <img src={card.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          {card.badge && (
            <span className="self-start font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/15 text-white mb-3">
              {card.badge}
            </span>
          )}
          <p className="text-white font-medium text-lg leading-snug mb-1">{card.title}</p>
          {card.subtitle && <p className="text-white/65 text-sm mb-3">{card.subtitle}</p>}
          {card.ctaLabel && (
            <button onClick={handleCta} className="self-start text-xs px-4 py-1.5 rounded-full bg-white text-gray-900 font-medium hover:opacity-90 transition-opacity">
              {card.ctaLabel}
            </button>
          )}
        </div>
      </div>
    )
  }

  // BANNER → gradient text card
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden p-6 flex flex-col justify-between" style={{ background: bg }}>
      <div>
        {card.badge && (
          <span className="inline-block font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/15 text-white mb-4">
            {card.badge}
          </span>
        )}
        <p className="text-white font-medium text-xl leading-snug mb-2">{card.title}</p>
        {card.subtitle && <p className="text-white/65 text-sm leading-relaxed">{card.subtitle}</p>}
      </div>
      <div className="flex items-center flex-wrap gap-2 mt-4">
        {card.tags?.slice(0, 5).map((tag) => (
          <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-white capitalize">
            {tag}
          </span>
        ))}
        {card.ctaLabel && (
          <button onClick={handleCta} className="ml-auto shrink-0 text-xs px-4 py-1.5 rounded-full bg-white text-gray-900 font-medium hover:opacity-90 transition-opacity">
            {card.ctaLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ── PromoCarousel ─────────────────────────────────────────────────────────────

const CARD_GAP = 16

function PromoCarousel() {
  const [index, setIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerStartX = useRef(0)

  const { data: cards = [], isLoading } = useQuery<PromoCard[]>({
    queryKey: ['promo-cards', 'CUSTOMER'],
    queryFn: async () => {
      const res = await api.get('/promo-cards?target=CUSTOMER')
      return (res.data.data ?? []) as PromoCard[]
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (paused || cards.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % cards.length), 5000)
    return () => clearInterval(id)
  }, [paused, cards.length])

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(i, cards.length - 1)))
  }, [cards.length])

  const slideWidth = containerWidth > 0 ? Math.round(containerWidth * 0.88) : 360
  const trackOffset = -index * (slideWidth + CARD_GAP)

  if (isLoading) {
    return (
      <Container>
        <div className="h-48 rounded-2xl bg-bone border border-line animate-pulse" />
      </Container>
    )
  }

  if (cards.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="flex pl-6"
        style={{ gap: CARD_GAP, cursor: cards.length > 1 ? 'grab' : 'default' }}
        animate={{ x: trackOffset }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        onPointerDown={(e) => { pointerStartX.current = e.clientX }}
        onPointerUp={(e) => {
          const delta = pointerStartX.current - e.clientX
          if (Math.abs(delta) < 8) return
          goTo(delta > 0 ? index + 1 : index - 1)
        }}
      >
        {cards.map((card) => (
          <div key={card.id} className="shrink-0" style={{ width: slideWidth, height: 192 }}>
            <PromoCardView card={card} />
          </div>
        ))}
      </motion.div>

      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === index ? 'w-5 h-1.5 bg-ink' : 'w-1.5 h-1.5 bg-ink/20 hover:bg-ink/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { lat, requestLocation, isLoading: locLoading } = useLocationStore()
  const [showPincode, setShowPincode] = useState(false)
  const [pincode, setPincode] = useState('')

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">

        <AnnouncementBar />

        <Navbar
          logo={<NavbarLogo />}
          nav={
            <>
              <NavLink href="/search">Medicines</NavLink>
              <NavLink href="/orders">Orders</NavLink>
            </>
          }
          mobileMenu={
            <div className="flex flex-col gap-1 pb-2">
              <NavLink href="/search">Medicines</NavLink>
              <NavLink href="/orders">Orders</NavLink>
              <div className="pt-2 mt-1 border-t border-line">
                <Link
                  to="/auth/login"
                  className="w-full inline-flex items-center justify-center h-10 rounded-md bg-ink px-5 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          }
        >
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center h-9 rounded-md bg-ink px-5 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors"
          >
            Sign in
          </Link>
        </Navbar>

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <section
          className="hero-gradient flex-1 flex items-center justify-center px-6 py-24 lg:py-32 relative overflow-hidden"
          style={{ minHeight: 'calc(100vh - 112px)' }}
        >
          {/* SVG grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: SVG_GRID, opacity: 0.03 }}
          />

          {/* Gradient orb */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-[-10%] top-[-20%] w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'var(--gradient-orb)' }}
          />

          {/* Watermark */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-6 left-0 right-0 overflow-hidden select-none"
          >
            <p
              className="font-display font-medium leading-none tracking-[-0.04em] text-ink whitespace-nowrap px-6"
              style={{ fontSize: 'clamp(72px, 16vw, 160px)', opacity: 0.025 }}
            >
              PHARMABRIDGE
            </p>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
            {/* Left copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-mint border border-rx/20 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-rx animate-pulse" />
                <Mono muted>Open pharmacies near you</Mono>
              </div>

              <Heading as="h1" size="hero" balance className="mb-6">
                Medicine, delivered
                <br />
                <span className="text-ink/40">with trust.</span>
              </Heading>

              <Text size="lg" muted balance className="max-w-md mb-10">
                India's UPI-first pharmacy network. Order from licensed neighbourhood pharmacies — fast delivery, verified prescriptions.
              </Text>

              {/* Search + GPS row */}
              <div className="flex gap-2 max-w-md">
                <div className="flex-1 flex items-center gap-3 bg-paper border border-line rounded-md px-4 py-3 focus-within:border-brand-indigo transition-colors shadow-soft">
                  <Search size={16} className="text-ink/30 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search medicines, pharmacies…"
                    className="flex-1 bg-transparent text-ink placeholder-ink/30 outline-none text-sm"
                    onFocus={() => { window.location.href = '/search' }}
                    readOnly
                  />
                </div>

                <div className="relative shrink-0">
                  {!lat && (
                    <motion.div
                      className="absolute inset-0 rounded-md"
                      style={{ background: 'rgba(14,124,102,0.4)' }}
                      animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <button
                    onClick={requestLocation}
                    disabled={locLoading}
                    className="relative inline-flex items-center gap-2 px-4 py-3 rounded-md border border-line bg-paper text-ink/60 hover:border-rx hover:text-rx transition-all duration-150 text-sm disabled:opacity-40 shadow-soft whitespace-nowrap"
                  >
                    <MapPin size={15} />
                    {locLoading ? 'Locating…' : lat ? 'Located' : 'Near me'}
                  </button>
                </div>
              </div>

              {/* Pincode toggle */}
              <div className="mt-3 flex items-center gap-2 h-7">
                {!showPincode ? (
                  <button
                    onClick={() => setShowPincode(true)}
                    className="text-xs text-ink/40 hover:text-ink/70 transition-colors underline underline-offset-2"
                  >
                    Enter pincode instead
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit pincode"
                      className="w-36 h-8 border border-line rounded-md px-3 text-xs bg-paper text-ink placeholder-ink/30 outline-none focus:border-brand-indigo transition-colors"
                      autoFocus
                    />
                    {pincode.length === 6 && (
                      <Link
                        to={`/search?pincode=${pincode}`}
                        className="inline-flex h-8 items-center px-3 rounded-md bg-ink text-paper text-xs font-medium hover:bg-ink/90 transition-colors"
                      >
                        Go
                      </Link>
                    )}
                    <button
                      onClick={() => { setShowPincode(false); setPincode('') }}
                      className="text-xs text-ink/40 hover:text-ink/70 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <Mono muted className="mt-4 block">
                Razorpay UPI · Serving 50+ cities
              </Mono>
            </div>

            {/* Right — decorative orb */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-80 h-80">
                <div
                  className="absolute inset-0 rounded-full animate-orb-spin"
                  style={{
                    background: 'var(--gradient-orb)',
                    mask: 'radial-gradient(transparent 60%, black 60%)',
                    WebkitMask: 'radial-gradient(transparent 60%, black 60%)',
                    opacity: 0.15,
                  }}
                />
                <div className="absolute inset-[20%] rounded-full bg-gradient-to-br from-mist via-paper to-mint shadow-card flex items-center justify-center">
                  <Heading as="span" size="2xl" muted>Rx</Heading>
                </div>
                <span className="absolute top-4 right-0 bg-paper border border-line rounded-pill px-2 py-1 shadow-soft">
                  <Mono muted>↑ FASTER DELIVERY</Mono>
                </span>
                <span className="absolute bottom-10 left-0 bg-paper border border-line rounded-pill px-2 py-1 shadow-soft">
                  <Mono muted>↓ LOWER PRICES</Mono>
                </span>
                <span className="absolute bottom-1 right-4 bg-paper border border-line rounded-pill px-2 py-1 shadow-soft">
                  <Mono muted>↑ VERIFIED Rx</Mono>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Promo Carousel ─────────────────────────────────────────────── */}
        <section className="py-8 bg-paper">
          <PromoCarousel />
        </section>

        {/* ── 3. Doctor CTA Strip ───────────────────────────────────────────── */}
        <Section tint="bone" tight>
          <Container>
            <div
              className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              style={{
                background: '#0F1117',
                border: '1px solid rgba(74,222,128,0.2)',
                boxShadow: '0 0 32px rgba(74,222,128,0.06)',
              }}
            >
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(74,222,128,0.65)' }}
                >
                  Virtual &amp; In-Person
                </p>
                <Heading as="h2" size="2xl" className="text-white mb-2">
                  Consult a doctor today
                </Heading>
                <p className="text-white/50 text-sm leading-relaxed">
                  Book video or walk-in appointments at pharmacies near you.
                </p>
              </div>
              <Link
                to="/doctors"
                className="shrink-0 inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-medium uppercase tracking-wider transition-opacity hover:opacity-90"
                style={{ background: '#4ADE80', color: '#0A0A0B' }}
              >
                Book now
                <ArrowRight size={14} />
              </Link>
            </div>
          </Container>
        </Section>

        {/* ── 4. Pharmacy Discovery ─────────────────────────────────────────── */}
        <Section>
          <Container>
            {lat ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Mono muted className="mb-1 block">Nearby</Mono>
                    <Heading as="h2" size="2xl">Pharmacies</Heading>
                  </div>
                  <Link
                    to="/search?type=pharmacy"
                    className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors"
                  >
                    View all <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-xl bg-bone border border-line animate-pulse" />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mint mb-6">
                  <MapPin size={28} className="text-rx" />
                </div>
                <Heading as="h2" size="2xl" className="mb-3">Pharmacies near you</Heading>
                <Text muted className="mb-6 max-w-xs mx-auto">
                  Enable location to discover licensed pharmacies in your area.
                </Text>
                <button
                  onClick={requestLocation}
                  disabled={locLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-5 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90 transition-colors disabled:opacity-40"
                >
                  <Navigation size={14} />
                  {locLoading ? 'Locating…' : 'Enable location'}
                </button>
              </div>
            )}
          </Container>
        </Section>

        {/* ── 5. Popular Categories ─────────────────────────────────────────── */}
        <Section tint="bone" tight>
          <Container>
            <div className="flex items-center justify-between mb-6">
              <div>
                <Mono muted className="mb-1 block">Browse</Mono>
                <Heading as="h2" size="2xl">Popular categories</Heading>
              </div>
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors"
              >
                All medicines <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
              {CATEGORIES.map(({ label, emoji, bg }) => (
                <Link
                  key={label}
                  to={`/search?q=${encodeURIComponent(label)}`}
                  className={`${bg} rounded-xl p-3 flex flex-col items-center gap-2 hover:scale-[1.03] transition-transform duration-150`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs font-medium text-ink/70 text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Feature Cards ─────────────────────────────────────────────────── */}
        <Section>
          <Container>
            <Mono muted className="mb-2 block">The PharmaBridge Platform</Mono>
            <Heading as="h2" size="display" balance className="mb-12">
              Built for India's pharmacy network.
            </Heading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURE_CARDS.map((card) => (
                <div
                  key={card.eyebrow}
                  className={`${card.tint} rounded-2xl p-10 flex flex-col gap-6 hover:scale-[1.01] transition-transform duration-200`}
                >
                  <div className="inline-flex items-center gap-1.5 self-start bg-paper rounded-pill px-3 py-1.5 border border-line shadow-soft">
                    <Mono muted>{card.eyebrow}</Mono>
                    <ArrowRight size={10} className="text-ink/40" />
                  </div>
                  <div>
                    <Heading as="h3" size="2xl" className="mb-2">{card.headline}</Heading>
                    <Text muted size="sm">{card.body}</Text>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── 6. Footer ─────────────────────────────────────────────────────── */}
        <Footer>
          <FooterContent>
            <FooterColumns columns={FOOTER_LINKS} />
            <div className="mt-12">
              <FooterBottom
                links={[
                  { label: 'Privacy Policy' },
                  { label: 'Terms' },
                  { label: 'Contact' },
                ]}
              />
            </div>
          </FooterContent>
        </Footer>

      </div>
    </PageTransition>
  )
}
