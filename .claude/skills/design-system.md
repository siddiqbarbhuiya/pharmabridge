Visual Language
Mood: Clean, scientific, optimistic. Generous whitespace, soft pastel gradients, sharp typography, subtle 3D / glassy hero artwork. Feels like a research-grade platform — premium but approachable.

Color Palette

// tailwind.config.ts → theme.extend.colors
colors: {
// Core neutrals
ink: '#0A0A0B', // near-black for text & primary buttons
paper: '#FFFFFF',
bone: '#F7F7F5', // section backgrounds
line: '#E6E6E3', // hairline borders

// Pastel section tints (used as full-bleed card backgrounds)
sky: '#DCE8FF', // hero wash (cool blue)
mist: '#EAF1FF',
blush: '#FBE3E8', // "lower cost" style card
peach: '#FFE0CC', // "faster" style card
mint: '#D8F0E2', // success / health accent
lilac: '#E4DEFF',

// Brand accents (gradient stops for 3D artwork & highlights)
brand: {
indigo: '#5B5BFF',
violet: '#8A6BFF',
coral: '#FF6A4D',
cyan: '#7BC8FF',
},

// Semantic (PharmaBridge)
rx: '#0E7C66', // pharmacy primary
warning: '#C77700',
danger: '#C0392B',
}
Gradients

--gradient-hero: radial-gradient(120% 80% at 50% 0%, #EAF1FF 0%, #FFFFFF 70%);
--gradient-orb: conic-gradient(from 220deg, #5B5BFF, #8A6BFF, #FF6A4D, #7BC8FF, #5B5BFF);
--gradient-pill: linear-gradient(180deg, #FFFFFF 0%, #F2F2EF 100%);
Typography
Display / Headings: "Aeonik" or fallback "Inter Tight", weight 500, tight tracking (-0.02em), large sizes (clamp 40–96px).
Body: "Inter", weight 400, 16/26.
Mono / Labels: "JetBrains Mono" uppercase, 11px, letter-spacing 0.12em — used for eyebrow tags like ↑ FASTER INFERENCE.

fontFamily: {
display: ['"Inter Tight"', 'system-ui', 'sans-serif'],
sans: ['Inter', 'system-ui', 'sans-serif'],
mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
}
Spacing & Radius
Base unit: 4px. Section padding: py-24 md:py-32.
Container max-width: 1280px, gutter px-6.
Radius scale: sm 6 / md 10 / lg 16 / xl 24 / 2xl 32 / pill 9999.
Hairline borders only (1px solid var(--line)); avoid heavy shadows. Use one soft shadow: 0 1px 2px rgba(10,10,11,.04), 0 8px 24px rgba(10,10,11,.04).
🧩 Component Recipes

1. Top announcement bar
   Full-width black (bg-ink text-paper), 40px tall, centered text with ⚡ emoji + arrow link. Auto-rotates between messages every 5s (Framer Motion fade).
2. Header
   White, 72px, sticky, hairline bottom border.
   Left: wordmark + tiny colored orb logo (use the brand gradient).
   Center: nav links with caret dropdowns (Inference ▾, Compute ▾, …). Dropdown = white panel, 24px padding, shadow-soft, 240px wide.
   Right: ghost link Contact Sales, then primary pill button Sign in (bg-ink text-paper rounded-md px-5 h-10).
3. Hero
   Background: --gradient-hero.
   Two-column grid (lg:grid-cols-2), 80vh.
   Left: Eyebrow blank, then huge headline split in two weights/colors:

<h1>
  <span class="text-ink">Build what's next</span><br/>
  <span class="text-ink/40">on the AI Native Cloud</span>
</h1>
Sub: 18px muted. Two CTAs: primary black pill + secondary white-bordered pill.
Right: 3D abstract orb artwork with annotation lines + mono labels (OPTIMIZED TRAINING, PRODUCTION INFERENCE, CUTTING-EDGE RESEARCH). Use a rendered PNG/WebP or react-three-fiber with MeshTransmissionMaterial.
4. Trusted-by strip
Mono label TRUSTED BY left, then row of grayscale logos at 40% opacity, hover → 100%.
5. Feature cards row ("The Together AI Platform")
3 equal-width cards, each with a different pastel background (mist, blush, peach).
Top-left: small white pill with mono label + arrow icon (↑ FASTER INFERENCE).
Inside: large headline, paragraph, embedded illustration / chart at the bottom.
Rounded 2xl, padding 40px, no shadow.
6. Buttons

// primary
className="inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium uppercase tracking-wider text-paper hover:bg-ink/90"
// secondary
className="inline-flex h-11 items-center rounded-md border border-line bg-paper px-6 text-sm font-medium uppercase tracking-wider text-ink hover:bg-bone" 7. Footer ("watermark" style for PharmaBridge)
Black background, oversized faint wordmark PHARMABRIDGE as watermark behind the link columns. 4 columns of links + newsletter input.
✨ Motion (Framer Motion)
Page enter: stagger children, y: 16 → 0, opacity: 0 → 1, duration 0.5, ease [0.22, 1, 0.36, 1].
Hero orb: slow continuous rotate (30s linear infinite) + subtle parallax on mouse move.
Announcement bar: AnimatePresence crossfade between messages.
Cards: hover → scale 1.01, border darkens to ink/15.
🏥 PharmaBridge adaptations
Swap AI Native Cloud headline for: "Medicine, delivered with trust." / sub: "India's UPI-first pharmacy network."
Replace 3D AI orb with a 3D pill-capsule + caduceus orbit, same gradient palette.
Feature cards: ↑ FASTER DELIVERY, ↓ LOWER PRICES, ↑ VERIFIED PHARMACIES.
Keep the pastel system; add mint for prescription-success states and rx green as the secondary brand accent for CTAs related to ordering.
