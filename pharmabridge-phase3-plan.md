# PharmaBridge — Phase 3 Extension Plan
### Doctor Appointments + Promo Cards + PWA Completion
**Picks up from: Section 16, Step 2 (Design System done)**

---

## Overview of What's New in This Plan

| Feature | Priority | Complexity |
|---|---|---|
| Doctor Appointment Booking | 🔴 HIGH | High |
| Promo Card System (Commercial Ads) | 🟡 MEDIUM | Medium |
| PWA Completion (all 3 apps) | 🔴 HIGH | High |
| Pharmacy Doctor Listing (Panel) | 🔴 HIGH | Medium |
| Admin Promo Management | 🟡 MEDIUM | Low |

---

## New Skill File Required

Before continuing in Claude Code, create this new skill file at `.claude/skills/appointments.md`:

```markdown
# Doctor Appointment System

## Business Rules
- Appointment booking is FREE for users (no payment)
- Doctors are listed BY pharmacies (pharmacy owns doctor slots)
- Pharmacy registers → admin verifies manually → pharmacy goes LIVE
- Only APPROVED pharmacies can list doctors
- Doctor is not a separate user account — they are a profile under a pharmacy
- Pharmacy staff manages all doctor availability and bookings

## Appointment Status Flow
PENDING → CONFIRMED → COMPLETED
PENDING → CANCELLED (by user or pharmacy)
CONFIRMED → NO_SHOW (by pharmacy if user didn't come)

## Availability Model
- DoctorAvailability: pharmacyId, doctorId, dayOfWeek (0–6), startTime, endTime, slotDurationMinutes
- TimeSlot: generated on-the-fly from availability, NOT stored in DB
- Appointment: stores booked slot (date + startTime + endTime)
- Max slots per day = Math.floor((endTime - startTime) / slotDuration)

## Doctor Profile Fields
- name, specialization, qualification, experience (years)
- consultationFee: 0 (FREE, kept in schema for future monetization)
- photo (Cloudinary)
- bio (short)
- languages spoken
- isActive

## Booking Rules
- User must be logged in
- One booking per user per doctor per day
- Slot must be in the future (no past booking)
- Cancellation allowed up to 2 hours before appointment
- Phone number mandatory (pharmacy will call to confirm)
```

---

## New Database Schema Additions

Add these models to `packages/api/prisma/schema.prisma`:

```prisma
// ─────────────── DOCTOR ───────────────
model Doctor {
  id              String              @id @default(cuid())
  pharmacyId      String
  pharmacy        Pharmacy            @relation(fields: [pharmacyId], references: [id])
  name            String
  specialization  String
  qualification   String
  experience      Int                 // years
  photo           String?             // Cloudinary URL
  bio             String?
  languages       String[]            @default(["English"])
  consultationFee Float               @default(0) // Free for now
  isActive        Boolean             @default(true)
  availability    DoctorAvailability[]
  appointments    Appointment[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

// ─────────────── DOCTOR AVAILABILITY ───────────────
model DoctorAvailability {
  id                  String   @id @default(cuid())
  doctorId            String
  doctor              Doctor   @relation(fields: [doctorId], references: [id])
  dayOfWeek           Int      // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime           String   // "09:00"
  endTime             String   // "13:00"
  slotDurationMinutes Int      @default(15)
  maxBookingsPerSlot  Int      @default(1)
  isActive            Boolean  @default(true)
}

// ─────────────── APPOINTMENT ───────────────
model Appointment {
  id              String            @id @default(cuid())
  appointmentNo   String            @unique // PB-APT-XXXXX
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  doctorId        String
  doctor          Doctor            @relation(fields: [doctorId], references: [id])
  pharmacyId      String
  pharmacy        Pharmacy          @relation(fields: [pharmacyId], references: [id])
  date            DateTime          // The appointment date (date only)
  startTime       String            // "10:00"
  endTime         String            // "10:15"
  status          AppointmentStatus @default(PENDING)
  patientName     String
  patientPhone    String
  patientAge      Int?
  symptoms        String?
  notes           String?           // Pharmacy/doctor notes
  cancelReason    String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

// ─────────────── PROMO CARD ───────────────
model PromoCard {
  id          String        @id @default(cuid())
  type        PromoCardType // TEXT, IMAGE_PANEL, FULL_IMAGE
  badge       String?       // "Market Insights" with emoji
  title       String
  subtitle    String?
  imageUrl    String?       // Cloudinary URL (for IMAGE_PANEL, FULL_IMAGE)
  background  String        @default("#3B82F6") // hex color or gradient key
  stockTags   String[]      @default([])        // linked pharmacy/product tags
  ctaLabel    String?       // "Open Screener →"
  ctaUrl      String?       // deep link or external URL
  targetApp   PromoTarget   @default(CUSTOMER)
  isActive    Boolean       @default(true)
  order       Int           @default(0)         // display order
  startAt     DateTime?
  endAt       DateTime?
  createdBy   String                            // adminUserId
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum PromoCardType {
  TEXT
  IMAGE_PANEL
  FULL_IMAGE
}

enum PromoTarget {
  CUSTOMER
  PHARMACY
  ALL
}
```

Also add relations to existing models:
```prisma
// Add to User model:
appointments  Appointment[]

// Add to Pharmacy model:
doctors       Doctor[]
appointments  Appointment[]
```

---

## New API Endpoints

### Doctor & Appointment Routes

```
// Public
GET  /api/v1/doctors?pharmacyId=&specialization=&date= — list doctors with availability
GET  /api/v1/doctors/:id                               — doctor profile
GET  /api/v1/doctors/:id/slots?date=                   — available time slots for a date

// Customer (authenticated)
POST /api/v1/appointments                              — book appointment
GET  /api/v1/appointments                              — user's appointments
GET  /api/v1/appointments/:id                          — appointment detail
POST /api/v1/appointments/:id/cancel                   — cancel (2hr rule)

// Pharmacy (authenticated, PHARMACY_OWNER)
GET  /api/v1/pharmacy/doctors                          — list my doctors
POST /api/v1/pharmacy/doctors                          — add doctor
PATCH /api/v1/pharmacy/doctors/:id                     — update doctor
DELETE /api/v1/pharmacy/doctors/:id                    — deactivate doctor
GET  /api/v1/pharmacy/doctors/:id/availability         — get availability schedule
PUT  /api/v1/pharmacy/doctors/:id/availability         — set full availability schedule
GET  /api/v1/pharmacy/appointments                     — all appointments for pharmacy
PATCH /api/v1/pharmacy/appointments/:id/status         — confirm/complete/no-show

// Admin
GET  /api/v1/admin/appointments                        — all appointments, filters
```

### Promo Card Routes

```
// Customer (public — no auth needed to VIEW)
GET  /api/v1/promo-cards?target=CUSTOMER               — active promo cards for customer app

// Admin (authenticated, ADMIN)
GET  /api/v1/admin/promo-cards                         — all promo cards
POST /api/v1/admin/promo-cards                         — create promo card
PATCH /api/v1/admin/promo-cards/:id                    — update promo card
DELETE /api/v1/admin/promo-cards/:id                   — soft delete
PATCH /api/v1/admin/promo-cards/reorder                — drag-to-reorder
```

---

## New Skill File: Promo Cards

Create `.claude/skills/promo-cards.md`:

```markdown
# Promo Card System

## Card Types (matches design from screenshots)
1. TEXT — gradient background + badge + title + subtitle + optional CTA
2. IMAGE_PANEL — left: text content, right: image panel (split layout)
3. FULL_IMAGE — full background image with text overlay

## Carousel Behavior (customer app home page)
- Horizontal scroll carousel with dot pagination
- Auto-advances every 5 seconds (Framer Motion AnimatePresence)
- Touch/swipe support on mobile
- Shows partial next card to indicate scrollability
- Position: appears ABOVE pharmacy discovery section on home page

## Background Options (TEXT type)
- Blue gradient: linear-gradient(135deg, #3B82F6, #6366F1)
- Green gradient: linear-gradient(135deg, #10B981, #059669)
- Purple gradient: linear-gradient(135deg, #8B5CF6, #6D28D9)
- Orange gradient: linear-gradient(135deg, #F97316, #EF4444)
- Dark gradient: linear-gradient(135deg, #1E293B, #0F172A)
- Pink gradient: linear-gradient(135deg, #EC4899, #DB2777)

## Badge Format
Emoji + text label. Examples: "🏥 Health Tips", "💊 Offer", "📊 Market Insights"
Badge pill: white/10% opacity background, small pill shape.

## CTA (optional)
If ctaUrl starts with "/" — internal navigation (React Router push)
If ctaUrl starts with "http" — open in new tab

## Stock Tags
Tags link to pharmacy search (pharmacySlug) or medicine search (medicineName).
Displayed as small chips below the card content.
```

---

## Step-by-Step Claude Code Instructions

> You are currently at: **Section 16, Step 2 complete** (monorepo initialized, design system created)
> Continue from **Step 3** below.

---

### PHASE 0 CONTINUATION (resume from Step 2)

---

#### STEP 3 — Shared Types (including new entities)

Prompt to Claude Code:
```
In packages/types, create Zod schemas for ALL entities.
Read .claude/skills/api-conventions.md.

Create schemas for:
- User, Address (existing)
- Pharmacy, Medicine, Order, OrderItem, Prescription (existing)  
- Notification, Commission (existing)
- Doctor, DoctorAvailability, Appointment (NEW)
- PromoCard (NEW)

All enum types must match Prisma schema exactly.
Also create: API response wrappers, pagination schema, error codes enum.
Export everything from packages/types/index.ts.
Types must work in both frontend and backend — no Node.js imports.
```

---

#### STEP 4 — Fastify Server + Full Prisma Schema

Prompt to Claude Code:
```
In packages/api, set up the Fastify server with TypeScript.
Read all files in .claude/skills/ before starting.

1. Install dependencies:
   fastify @fastify/cors @fastify/cookie @fastify/jwt @fastify/multipart
   @fastify/rate-limit prisma @prisma/client ioredis zod pino bullmq
   razorpay cloudinary firebase-admin socket.io

2. Create prisma/schema.prisma with the COMPLETE schema including:
   - All original tables: User, Address, Pharmacy, Medicine, Order,
     OrderItem, OrderTimeline, Prescription, OrderPrescription,
     InventoryLog, Notification, Commission
   - NEW tables: Doctor, DoctorAvailability, Appointment, PromoCard
   - All enums including: AppointmentStatus, PromoCardType, PromoTarget
   - Proper relations between all models

3. Create src/server.ts — Fastify instance with all plugins
4. Create src/config.ts — Zod-validated env vars
5. Create src/plugins/ — auth, redis, prisma, socket plugins
6. Create src/middleware/ — authenticate.ts, requireRole.ts, validatePharmacyOwner.ts
7. Create src/utils/ — response.ts, errors.ts, slots.ts (slot generation utility)

In src/utils/slots.ts, implement:
  generateSlots(date: Date, availability: DoctorAvailability[], existingBookings: Appointment[])
  Returns array of { startTime, endTime, isAvailable } for a given date.

Run: pnpm prisma migrate dev --name init
```

---

#### STEP 5 — Auth Service

Prompt to Claude Code:
```
In packages/api, implement the authentication system.
Read .claude/skills/api-conventions.md and .claude/skills/indian-market.md.

Implement:
1. POST /api/v1/auth/send-otp
   - Validate Indian phone: /^[6-9]\d{9}$/
   - Generate 6-digit OTP, store in Redis with 10min TTL
   - Rate limit: max 5 OTP requests per phone per hour (Redis counter)
   - Log OTP to console for dev (skip MSG91 for now)
   - Return { requestId, expiresIn: 600 }

2. POST /api/v1/auth/verify-otp
   - Validate OTP, delete from Redis on success
   - Upsert user (create if new, fetch if existing)
   - Issue accessToken (JWT, 15min) in response body
   - Issue refreshToken (JWT, 30d) in pb_refresh_token httpOnly cookie
   - Return { user, accessToken }

3. POST /api/v1/auth/refresh
   - Read pb_refresh_token cookie
   - Validate and rotate refresh token (old invalidated in Redis)
   - Return { accessToken }

4. POST /api/v1/auth/logout — clear cookie + Redis

All inputs validated with Zod. All responses use standard format.
```

---

#### STEP 6 — Pharmacy + Medicine + Prescription APIs

Prompt to Claude Code:
```
In packages/api, implement pharmacy, medicine, and prescription routes.
Read all files in .claude/skills/ before starting.

1. Pharmacy routes (src/routes/pharmacies.ts):
   GET  /api/v1/pharmacies/nearby?lat=&lng=&radius=
   GET  /api/v1/pharmacies/:slug
   POST /api/v1/pharmacies (authenticated, creates PENDING pharmacy)
   PATCH /api/v1/pharmacies/:id/status (admin only)
   
   Nearby logic: use Haversine formula (no PostGIS needed):
   const dist = haversine(userLat, userLng, pharmacy.lat, pharmacy.lng)
   Filter where dist <= radius, sort by dist ASC.

2. Medicine routes (src/routes/medicines.ts):
   GET  /api/v1/medicines/search?q=&pharmacyId=&category=
   GET  /api/v1/medicines/:id
   POST /api/v1/medicines (PHARMACY_OWNER)
   PATCH /api/v1/medicines/:id (PHARMACY_OWNER, owns pharmacy)
   PATCH /api/v1/medicines/:id/stock (PHARMACY_OWNER)
   PATCH /api/v1/medicines/:id (soft delete via isActive=false)
   
   Validate: price <= mrp (Indian drug price control law)

3. Prescription routes (src/routes/prescriptions.ts):
   POST /api/v1/prescriptions/upload → return Cloudinary signed URL
   GET  /api/v1/prescriptions (user's own)
   PATCH /api/v1/prescriptions/:id/verify (PHARMACY_OWNER)

All Zod validation. All standard response format.
```

---

#### STEP 7 — Doctor + Appointment APIs (NEW)

Prompt to Claude Code:
```
In packages/api, implement the complete doctor appointment system.
Read .claude/skills/appointments.md and .claude/skills/api-conventions.md.

1. Slot generation utility (src/utils/slots.ts):
   - generateAvailableSlots(doctorId, date, prisma):
     a. Find DoctorAvailability for that dayOfWeek
     b. Get existing Appointments for that doctor+date
     c. Generate all slots (startTime + slotDuration increments)
     d. Mark each slot isAvailable = (bookingCount < maxBookingsPerSlot)
     e. Filter out past slots (compare with current time)
     f. Return: Array<{ startTime: string, endTime: string, isAvailable: boolean }>

2. Public doctor routes (src/routes/doctors.ts):
   GET /api/v1/doctors?pharmacyId=&specialization=
     - Returns doctors with isActive=true for APPROVED pharmacies only
     - Include pharmacy name and address
   
   GET /api/v1/doctors/:id
     - Full doctor profile + pharmacy info + weekly availability summary
   
   GET /api/v1/doctors/:id/slots?date=YYYY-MM-DD
     - Validate date is not in the past
     - Call generateAvailableSlots utility
     - Return slot array

3. Customer appointment routes (src/routes/appointments.ts):
   POST /api/v1/appointments
     - Body: { doctorId, date, startTime, patientName, patientPhone, patientAge?, symptoms? }
     - Validate slot is still available (re-run slot check inside transaction)
     - Check: no duplicate booking (same user + doctor + date)
     - Generate appointmentNo: "PB-APT-" + padded sequence
     - Create Appointment with status PENDING
     - Emit Socket.io event to pharmacy namespace
     - Queue notification job for pharmacy
     - Return appointment with full doctor + pharmacy details
   
   GET /api/v1/appointments (user's own, paginated, latest first)
   GET /api/v1/appointments/:id
   POST /api/v1/appointments/:id/cancel
     - Check: cancellation allowed only if > 2 hours before appointment
     - Check: only PENDING or CONFIRMED status
     - Update status to CANCELLED with cancelReason

4. Pharmacy doctor management (src/routes/pharmacy/doctors.ts):
   All routes require: authenticate + requireRole('PHARMACY_OWNER') + validatePharmacyOwner
   
   GET  /api/v1/pharmacy/doctors
   POST /api/v1/pharmacy/doctors
     - Body: { name, specialization, qualification, experience, bio, languages, photo }
   PATCH /api/v1/pharmacy/doctors/:id
   PATCH /api/v1/pharmacy/doctors/:id/deactivate (soft delete)
   
   GET  /api/v1/pharmacy/doctors/:id/availability
     - Returns 7-day availability schedule (one entry per dayOfWeek)
   PUT  /api/v1/pharmacy/doctors/:id/availability
     - Full replacement of availability schedule
     - Body: Array<{ dayOfWeek, startTime, endTime, slotDurationMinutes, isActive }>
   
   GET  /api/v1/pharmacy/appointments
     - Filter: status, doctorId, date range, page/limit
   PATCH /api/v1/pharmacy/appointments/:id/status
     - Allowed transitions: PENDING→CONFIRMED, CONFIRMED→COMPLETED, CONFIRMED→NO_SHOW
     - On CONFIRMED: send SMS + push notification to patient

Use Prisma transactions for booking creation (prevent double-booking via row-level check).
```

---

#### STEP 8 — Orders + Payments API

Prompt to Claude Code:
```
In packages/api, implement order and payment routes.
Read .claude/skills/api-conventions.md and .claude/skills/indian-market.md.

1. Order routes (src/routes/orders.ts):
   POST /api/v1/orders
     - Validate all medicines exist and have stock
     - Check prescription requirement (reject if Rx needed but not provided)
     - Calculate: subtotal, GST (per medicine gstPercent), delivery fee, total
     - Create Order + OrderItems + OrderTimeline in transaction
     - Decrement stock atomically
     - Emit socket event to pharmacy
   
   GET /api/v1/orders (customer's own, paginated)
   GET /api/v1/orders/:id (includes timeline + items + prescription status)
   PATCH /api/v1/orders/:id/status (PHARMACY_OWNER, state machine)
   POST /api/v1/orders/:id/cancel (CUSTOMER, only PENDING/CONFIRMED)

2. Order state machine — only allow valid transitions:
   PENDING → CONFIRMED | PRESCRIPTION_REQUIRED | CANCELLED
   CONFIRMED → PROCESSING | CANCELLED
   PROCESSING → READY_FOR_PICKUP | OUT_FOR_DELIVERY
   READY_FOR_PICKUP → DELIVERED
   OUT_FOR_DELIVERY → DELIVERED
   
   On every status change: insert OrderTimeline + emit socket + queue notification

3. Payment routes (src/routes/payments.ts):
   POST /api/v1/payments/create-order
     - Create Razorpay order (amount in paise: totalAmount * 100)
     - Return { razorpayOrderId, amount, currency: 'INR', key: RAZORPAY_KEY_ID }
   
   POST /api/v1/payments/verify
     - Verify HMAC signature: razorpay_order_id + "|" + razorpay_payment_id
     - Update order paymentStatus = PAID
     - Return { success: true, orderId }
   
   POST /api/v1/payments/webhook (no auth — verify by Razorpay signature header)
     - Handle: payment.captured, payment.failed, refund.processed

Order number format: PB-2025-00001 (year + 5-digit zero-padded sequence)
```

---

#### STEP 9 — Promo Card API (NEW)

Prompt to Claude Code:
```
In packages/api, implement the promo card system.
Read .claude/skills/promo-cards.md and .claude/skills/api-conventions.md.

1. Public route:
   GET /api/v1/promo-cards?target=CUSTOMER
   - Return active promo cards where:
     - isActive = true
     - (startAt is null OR startAt <= now)
     - (endAt is null OR endAt >= now)
     - target = query param (CUSTOMER | PHARMACY | ALL)
   - Order by: order ASC, createdAt DESC
   - No pagination (max 10 cards)

2. Admin routes (require ADMIN role):
   GET  /api/v1/admin/promo-cards (all, including inactive, paginated)
   POST /api/v1/admin/promo-cards
     Body schema (Zod):
       type: PromoCardType enum
       badge?: string (max 50 chars)
       title: string (required, max 100 chars)
       subtitle?: string (max 200 chars)
       imageUrl?: string (URL, required if type != TEXT)
       background: string (hex color or gradient key, default "#3B82F6")
       stockTags?: string[] (max 10 tags)
       ctaLabel?: string
       ctaUrl?: string
       targetApp: PromoTarget enum
       startAt?: datetime
       endAt?: datetime
       order?: number (integer)
   
   PATCH /api/v1/admin/promo-cards/:id (partial update)
   DELETE /api/v1/admin/promo-cards/:id (soft delete: isActive = false)
   POST /api/v1/admin/promo-cards/reorder
     Body: { cards: Array<{ id: string, order: number }> }
     Update order field for all provided IDs in a transaction.

Seed 3 sample promo cards in prisma/seed.ts for development.
```

---

#### STEP 10 — WebSocket + Notification System

Prompt to Claude Code:
```
In packages/api, add Socket.io and the notification system.

1. Add Socket.io to Fastify (src/plugins/socket.plugin.ts):
   - Namespaces: /customer, /pharmacy, /admin
   - Auth: validate Bearer JWT on connection handshake
   - Rooms: user joins "user:{userId}", pharmacy joins "pharmacy:{pharmacyId}"
   - Reject unauthenticated connections with code 401

2. Create src/services/notification.service.ts:
   - sendPush(userId, title, body, data): FCM via firebase-admin
   - saveToDB(userId, title, body, type, data): insert Notification row
   - emitSocket(namespace, room, event, payload): emit to Socket.io room
   - sendAppointmentConfirmation(appointment): compose + send to patient

3. BullMQ queues (src/queues/):
   - notification.queue.ts: queue + worker for push notifications
   - appointment.queue.ts: queue for appointment reminder (1hr before)

4. Notification routes:
   GET  /api/v1/notifications (paginated, unread first)
   PATCH /api/v1/notifications/:id/read
   PATCH /api/v1/notifications/read-all

Socket events emitted by server:
  To /customer namespace, room user:{userId}:
    "order:status_updated" — { orderId, status, message }
    "appointment:confirmed" — { appointmentId, doctorName, time }
    "appointment:cancelled" — { appointmentId, reason }
  
  To /pharmacy namespace, room pharmacy:{pharmacyId}:
    "order:new" — { orderId, orderNumber, itemCount, totalAmount }
    "appointment:new" — { appointmentId, patientName, doctorName, time }
    "appointment:cancelled" — { appointmentId, patientName }
```

---

### PHASE 2 — Customer PWA (Continue from here)

---

#### STEP 11 — Customer App Setup + Routing

Prompt to Claude Code:
```
In apps/customer, set up the React PWA with full routing.
Read .claude/skills/pwa-config.md and .claude/skills/design-system.md.

1. Install vite-plugin-pwa, configure with manifest from pwa-config.md
   theme_color: "#08080E", background_color: "#08080E"

2. React Router v6 — ALL routes lazy-loaded — add these routes:
   Existing: /, /search, /pharmacy/:slug, /medicine/:id, /cart
   Existing: /checkout/*, /orders, /orders/:id, /prescriptions, /profile
   Existing: /auth/login, /notifications
   
   NEW routes for this phase:
   /doctors                    — browse all doctors (search + filter)
   /doctors/:id                — doctor profile + book appointment
   /appointments               — my appointments list
   /appointments/:id           — appointment detail + cancel option

3. Zustand stores:
   - authStore: user, accessToken, login, logout
   - cartStore: items, addItem, removeItem, updateQty, clear (persisted localStorage)
   - locationStore: lat, lng, hasPermission, requestLocation

4. React Query client with global error handler (toast on error)
5. Axios instance with JWT interceptor (auto-refresh on 401)
6. Framer Motion page transition wrapper (y: 16→0, opacity, 200ms)
7. Offline fallback page (dark themed, branded, no external deps)
8. Import all components from packages/ui
```

---

#### STEP 12 — Home Page with Promo Carousel (NEW)

Prompt to Claude Code:
```
In apps/customer/src/pages/Home.tsx, build the landing page.
Read .claude/skills/design-system.md and .claude/skills/promo-cards.md.

SECTION ORDER (top to bottom):
1. Hero section
2. Promo Card Carousel (NEW — commercial ads)
3. Doctor Appointment CTA strip (NEW)
4. Pharmacy discovery (map + list)
5. Popular categories
6. Footer with watermark

DETAILED REQUIREMENTS:

1. Hero section:
   - Full viewport height, subtle SVG 1px grid pattern (opacity 0.03)
   - Large headline: "Medicine delivered from your local pharmacy"
   - GPS location button (green accent #4ADE80, glowing pulse animation)
   - Manual pincode input as alternative
   - PharmaBridge watermark at opacity 0.03

2. Promo Card Carousel (directly below hero):
   - Fetch from GET /api/v1/promo-cards?target=CUSTOMER
   - Horizontal carousel, shows ~1 full card + partial next card
   - Dot pagination below
   - Auto-advance every 5 seconds (Framer Motion AnimatePresence)
   - Swipe/touch support (use Framer Motion drag or react-swipeable)
   - Card rendering (match the design from screenshots exactly):
   
   TEXT type card:
     - Full-width card with gradient background (from card.background)
     - Top-left: badge pill (emoji + label, white/10% background)
     - Large bold title (white text)
     - Subtitle text (white/70%)
     - Bottom: CTA button (white, rounded pill) if ctaLabel exists
     - Stock tags as small chips at bottom-left
   
   IMAGE_PANEL type:
     - Left 65%: text content (badge, title, subtitle, CTA)
     - Right 35%: image panel with cover fit
     - Gradient overlay on left→right for text legibility
   
   FULL_IMAGE type:
     - Full bleed image as background
     - Text overlay with dark gradient (bottom 50%)
     - Badge, title, subtitle, CTA overlaid on image
   
   Skeleton: show 1 skeleton card while loading

3. Doctor Appointment CTA strip:
   - Dark card with subtle green glow border
   - Left: 🩺 icon + "Consult a Doctor" title + "Free appointments at nearby pharmacies"
   - Right: "Book Now →" button (green accent)
   - Links to /doctors page
   - Full width, between promo carousel and pharmacy section

4. Pharmacy discovery, categories, footer (same as original plan)
```

--- DDDDDDDDDDDDDDDD

#### STEP 13 — Medicine Search + Pharmacy Detail

*(Same as original plan Step 11 — no changes)*

Prompt to Claude Code:
```
Build the search and pharmacy detail pages in apps/customer.
(Use original plan Step 11 prompt — unchanged)
Also on /pharmacy/:slug page, add a "Doctors Available" section:
- Show doctor cards: photo, name, specialization, "Book Appointment →"
- Only shown if pharmacy has isActive doctors
- Tappable card links to /doctors/:id
```

---

#### STEP 14 — Cart + Checkout Flow

*(Same as original plan Step 12 — no changes)*

---

#### STEP 15 — Doctor Browsing + Booking (NEW)

Prompt to Claude Code:
```
Build the doctor discovery and appointment booking pages in apps/customer.
Read .claude/skills/appointments.md and .claude/skills/design-system.md.

1. /doctors page:
   - Search bar: "Search by name or specialization"
   - Filter chips: specialization categories (General, Dermatology, Diabetes, etc.)
   - DoctorCard component:
     - Doctor photo (avatar fallback with initials)
     - Name, specialization, qualification
     - Experience badge ("8 yrs exp")
     - Languages chips
     - Pharmacy name + distance
     - "FREE" badge (green) — consultation fee
     - "Book Appointment →" CTA
   - Empty state: "No doctors found nearby"
   - Load with user's location context (pass lat/lng in query)

2. /doctors/:id page (Doctor Profile + Booking):
   - Doctor hero: large photo, name, specialization
   - Stats row: experience, languages, pharmacy name
   - Pharmacy address + distance + map pin
   - "Consultation: FREE" green badge (prominent)
   - Bio section
   
   AVAILABILITY CALENDAR:
   - Horizontal date picker: today + next 6 days (7 days total)
   - Each date shows day name + date number
   - Disabled past dates and days with no availability
   - On date select: fetch GET /api/v1/doctors/:id/slots?date=YYYY-MM-DD
   
   TIME SLOTS GRID:
   - Display available/unavailable slots as pill buttons
   - Available: green outline, tappable
   - Unavailable: grey, disabled, strikethrough
   - Loading skeleton while fetching slots
   
   BOOKING FORM (appears after slot selection):
   - Patient Name (pre-fill from user profile)
   - Phone number (pre-fill from auth)
   - Age (optional)
   - Symptoms / Reason for visit (textarea, optional)
   - "Confirm Appointment" button (green CTA)
   
   On submit:
   - POST /api/v1/appointments
   - Show success screen (Framer Motion animation):
     ✓ checkmark animation
     "Appointment Confirmed!"
     Appointment number, doctor name, date, time, pharmacy address
     "Add to Calendar" button (generates .ics file)
     "View My Appointments" button

3. /appointments page:
   - Tabs: Upcoming | Past
   - AppointmentCard:
     - Doctor name + specialization
     - Date + time (formatted DD/MM/YYYY, HH:MM AM/PM)
     - Pharmacy name + address
     - Status badge (PENDING=yellow, CONFIRMED=green, COMPLETED=grey, CANCELLED=red)
     - "Cancel" button (only for PENDING/CONFIRMED and > 2hrs away)
   - Real-time status updates via Socket.io

4. /appointments/:id page:
   - Full appointment details
   - Status timeline (like order timeline)
   - Cancel button with confirmation modal
   - "Book Again" button (same doctor)
```

---

#### STEP 16 — Order Tracking + Profile

*(Same as original plan Step 13 — no changes)*

---

### PHASE 3 — Pharmacy Panel PWA

---

#### STEP 17 — Pharmacy Panel Setup + Medicine Management

Prompt to Claude Code:
```
In apps/pharmacy, set up the Pharmacy Panel PWA.
Read .claude/skills/design-system.md and .claude/skills/pwa-config.md.

1. PWA setup (same manifest config, dark theme)
2. Routes (all lazy-loaded):
   /login              — OTP login
   /dashboard          — overview stats
   /orders             — order management
   /orders/:id         — order detail + status actions
   /medicines          — medicine inventory
   /medicines/add      — add medicine form
   /medicines/:id/edit — edit medicine
   /prescriptions      — prescription review queue
   /doctors            — doctor management (NEW)
   /doctors/add        — add doctor profile (NEW)
   /doctors/:id        — doctor profile + edit (NEW)
   /doctors/:id/availability — manage schedule (NEW)
   /appointments       — appointment management (NEW)
   /analytics          — sales charts
   /profile            — pharmacy profile + settings

3. Pharmacy-specific Zustand store:
   - pharmacyStore: pharmacyId, pharmacyData, isOpen toggle

4. Shared layout: Sidebar navigation (desktop) + Bottom nav (mobile)
```

---

#### STEP 18 — Pharmacy Doctor Management (NEW)

Prompt to Claude Code:
```
In apps/pharmacy, build the Doctor Management section.
Read .claude/skills/appointments.md.

1. /doctors page:
   - List of all doctors at this pharmacy
   - DoctorRow: photo, name, specialization, status badge, total appointments today
   - Actions: Edit, Manage Schedule, View Appointments, Deactivate
   - "Add Doctor" floating action button

2. /doctors/add page:
   Form fields:
   - Doctor photo upload (Cloudinary direct upload, circular preview)
   - Full name *
   - Specialization * (dropdown: General Physician, Cardiologist, Dermatologist, etc.)
   - Qualification * (MBBS, MD, etc.)
   - Years of experience *
   - Bio (textarea)
   - Languages spoken (multi-select chips)
   - isActive toggle (default ON)
   
   On submit: POST /api/v1/pharmacy/doctors
   Show success toast, redirect to doctor list

3. /doctors/:id/availability page:
   WEEKLY SCHEDULE BUILDER:
   - 7 rows, one per day (Sun–Sat)
   - Each row: day name | enable toggle | start time picker | end time picker | slot duration (15/20/30 min)
   - Disabled row = grey out when toggle is OFF
   - Preview panel: shows total slots per day, e.g. "Mon: 16 slots (09:00–13:00)"
   - "Save Schedule" button → PUT /api/v1/pharmacy/doctors/:id/availability
   - Load existing schedule on mount

4. /appointments page:
   - Date picker (default today) + filter by doctor + filter by status
   - AppointmentRow:
     - Time slot (HH:MM AM/PM)
     - Patient name + age + phone
     - Doctor name
     - Symptoms (truncated)
     - Status badge
     - Actions: Confirm | Mark No-Show | Complete
   - Real-time new appointment via Socket.io ("appointment:new" event)
   - Desktop: table layout. Mobile: card layout.
   - Export appointments list as CSV button (for admin records)
```

---

#### STEP 19 — Pharmacy Order Management + Analytics

*(Same as original plan Step 14–15 — no changes)*

---

### PHASE 4 — Admin Panel PWA

---

#### STEP 20 — Admin Panel Setup

Prompt to Claude Code:
```
In apps/admin, set up the Admin Panel PWA.
Read .claude/skills/design-system.md.

Routes:
  /login
  /dashboard           — platform stats
  /pharmacies          — all pharmacies (PENDING queue first)
  /pharmacies/:id      — review + approve/reject
  /orders              — all orders, filters
  /appointments        — all appointments, filters (NEW)
  /users               — user list
  /promo-cards         — promo card management (NEW)
  /analytics           — revenue, commissions
  /settings            — commission rates, system config
```

---

#### STEP 21 — Admin Promo Card Management (NEW)

Prompt to Claude Code:
```
In apps/admin, build the Promo Card Management section.
Read .claude/skills/promo-cards.md.

1. /promo-cards page:
   - List of all promo cards (active + inactive)
   - Preview thumbnail of each card (renders the actual card component in miniature)
   - Status toggle (active/inactive)
   - Drag-to-reorder (react-beautiful-dnd or Framer Motion drag)
   - "Add Promo Card" button

2. /promo-cards/new (and /promo-cards/:id/edit):
   CARD TYPE SELECTOR (matches screenshot design):
   - 3 tabs: [T] Text | [⊞] Image Panel | [⊡] Full Image
   - Selecting changes which fields appear
   
   FORM FIELDS (common to all types):
   - Badge: text input with emoji picker (optional)
   - Title * (required)
   - Subtitle (optional)
   - CTA Label (optional)
   - CTA URL (optional, validates URL format)
   - Target App: [Customer] [Pharmacy] [All]
   - Schedule: Start Date | End Date (optional date pickers)
   - Display Order: number input
   
   ADDITIONAL for TEXT type:
   - Background Color: 6 gradient swatches + custom hex input
     (matches the screenshot: blue, green, purple, orange, dark, pink circles)
   - Stock Tags: comma-separated input (e.g. "HDFCBANK, ICICIBANK" in screenshot)
     For PharmaBridge: medicine categories or pharmacy slugs
   
   ADDITIONAL for IMAGE_PANEL and FULL_IMAGE:
   - Image URL: text input OR "Choose image file" upload button
   - Upload → Cloudinary direct upload, show preview
   
   LIVE PREVIEW PANEL (right side on desktop, below form on mobile):
   - Renders the actual PromoCard component with current form values
   - Updates in real-time as user types
   
   On save: POST/PATCH /api/v1/admin/promo-cards
   Show toast, redirect to list

3. PromoCard React component (add to packages/ui):
   - Accepts: card object (type, badge, title, subtitle, background, imageUrl, ctaLabel)
   - Renders correct layout based on type
   - Used in both customer carousel AND admin preview
   - Export from packages/ui/index.ts
```

---

#### STEP 22 — Admin Pharmacy Approval + Appointment Overview

Prompt to Claude Code:
```
In apps/admin, build:

1. /pharmacies page:
   - "Pending Approval" section at top (badge with count)
   - PharmacyRow: name, city, owner phone, license number, submitted date, status badge
   - Status filter: All | Pending | Approved | Rejected | Suspended
   - Search by name or city

2. /pharmacies/:id page:
   - Full pharmacy details
   - License document viewer (Cloudinary PDF/image)
   - Owner details + contact info
   - "APPROVE" (green) and "REJECT" (red) buttons with confirmation modal
   - Rejection: requires rejection reason text
   - On approve → pharmacy goes live → owner notified via push + SMS

3. /appointments page:
   - Stats cards: Today's Total | Confirmed | Pending | Completed
   - Table: all appointments across all pharmacies
   - Filters: pharmacy, doctor, date range, status
   - Export CSV

4. /dashboard improvements:
   Add stats: total doctors, total appointments today, appointment completion rate
```

---

### PHASE 5 — PWA Finalization

---

#### STEP 23 — PWA Service Worker + Offline Experience

Prompt to Claude Code:
```
Finalize PWA configuration for ALL THREE apps (customer, pharmacy, admin).
Read .claude/skills/pwa-config.md carefully.

For each app:

1. vite-plugin-pwa configuration (match pwa-config.md exactly):
   - registerType: 'autoUpdate'
   - skipWaiting: true, clientsClaim: true
   - Workbox runtimeCaching: CacheFirst for images, NetworkFirst for API
   - Background sync for failed POST requests
   - offlineFallbackPage: '/offline.html'

2. Offline page (public/offline.html):
   - Fully self-contained (no external scripts/CSS)
   - Dark branded design (PharmaBridge wordmark, dark background)
   - "You're offline" message
   - "Retry Connection" button (calls window.location.reload())
   - Show what was cached (if service worker provides)

3. Custom install prompt (useInstallPrompt hook from pwa-config.md):
   - Trigger: after 30s on site AND not dismissed in last 7 days
   - Banner at bottom: "Install PharmaBridge for faster access"
   - "Install" and "Maybe Later" buttons
   - Track install acceptance

4. PWA icons:
   - Create icon generation script (scripts/generate-icons.js)
   - Uses sharp npm package to resize a source logo to all required sizes:
     72, 96, 128, 144, 152, 192, 384, 512
   - Place in each app's public/icons/ folder

5. Verify PWA Lighthouse score target: > 90 for all apps

6. Test checklist items:
   - App installable on Android Chrome
   - App installable on iOS Safari (Add to Home Screen)
   - Offline mode shows branded offline page
   - Background sync retries failed order API calls
```

---

#### STEP 24 — Performance Optimization

Prompt to Claude Code:
```
Optimize all three frontend apps for India network performance.
Read .claude/skills/indian-market.md and .claude/skills/pwa-config.md.

1. Bundle analysis:
   Install rollup-plugin-visualizer in all apps
   Run build + analyze output
   Target: < 200KB gzipped JS per app

2. Code splitting audit:
   Verify every route is lazy-loaded (React.lazy + Suspense)
   Ensure heavy libs in separate chunks:
   - Recharts: only in pharmacy + admin apps
   - React Leaflet: only in customer app
   - Framer Motion: all apps (it's core UI)

3. Image optimization:
   - All medicine images: Cloudinary URL transform /f_auto,q_auto,w_400,h_400,c_fill/
   - Doctor photos: /f_auto,q_auto,w_200,h_200,c_fill,r_max/ (circular)
   - Add loading="lazy" and decoding="async" to all below-fold images
   - Use width + height attributes on all images to prevent CLS

4. API performance:
   - Add Redis caching for GET /pharmacies/nearby (5min TTL, key: nearby:{lat_round}:{lng_round})
   - Add Redis caching for GET /promo-cards (10min TTL, invalidate on admin update)
   - Add Redis caching for GET /doctors/:id/slots?date= (2min TTL — short, slots change)
   - Axios request timeout: 15000ms (India servers)
   - Retry logic: 3 retries with exponential backoff on network errors

5. Critical CSS:
   - Inline critical CSS for above-the-fold in each app
   - Defer non-critical font loading
```

---

#### STEP 25 — Error Handling + Edge Cases

Prompt to Claude Code:
```
Implement comprehensive error handling across the full stack.

Frontend (all three apps):
1. Global React Error Boundary — branded error page (not default React white screen)
2. React Query global error handler: toast on API error (use error.code for friendly messages)
3. Network error detection: "Check your connection" toast when navigator.onLine = false
4. Empty states for EVERY list: orders, medicines, appointments, doctors, promo cards
5. 404 page: dark branded, with "Go Home" and "Go Back" buttons
6. Appointment booking race condition: handle SLOT_NO_LONGER_AVAILABLE error gracefully
   → Show "This slot was just taken. Please pick another time." + re-fetch slots

Backend:
1. Fastify global error handler: always returns standard error format
2. Prisma P2025 (not found) → 404 NOT_FOUND
3. Prisma P2002 (unique violation) → 400 DUPLICATE_ENTRY
4. Appointment double-booking → 409 with SLOT_NO_LONGER_AVAILABLE code
5. Appointment cancellation < 2hrs → 400 with CANCELLATION_WINDOW_EXPIRED code
6. Unhandled rejections: catch + log (Pino) — never expose stack traces in production
7. Rate limit exceeded: 429 with retry-after header
```

---

#### STEP 26 — Testing + Deployment

Prompt to Claude Code:
```
Set up testing and prepare for deployment.

1. Backend tests (Vitest — packages/api/src/__tests__/):
   - Auth flow: send-otp, verify-otp, refresh, logout
   - Slot generation: generateAvailableSlots with mock data
   - Appointment booking: valid booking, double-booking rejection, past slot rejection
   - Order state machine: valid and invalid transitions
   - Payment webhook: HMAC signature verification

2. Frontend tests (Vitest + React Testing Library):
   - cartStore: addItem, removeItem, updateQty, persist/rehydrate
   - PromoCard component: renders TEXT, IMAGE_PANEL, FULL_IMAGE types correctly
   - AppointmentCard: shows correct status badge per status
   - Slot grid: shows available/unavailable correctly

3. GitHub Actions CI (.github/workflows/ci.yml):
   - On PR: lint + typecheck + tests
   - On merge to main: deploy to staging

4. Production deployment:
   - packages/api → Railway.app
     - Set all env vars (DB, Redis, JWT, Cloudinary, Razorpay, MSG91, Firebase)
     - Run: pnpm prisma migrate deploy
     - Run: pnpm prisma db seed (admin user + sample promo cards)
   
   - apps/customer → Vercel (pharmabridge.in or custom domain)
   - apps/pharmacy → Vercel (pharmacy.pharmabridge.in)
   - apps/admin → Vercel (admin.pharmabridge.in, protected)
   
   - Cloudflare: set up DNS for all three domains, enable CDN + DDoS protection
   
   Post-deploy verification:
   - Register as customer → OTP login
   - Register pharmacy → admin approves it
   - Add doctor + set availability
   - Customer books appointment → pharmacy confirms
   - Place medicine order → complete payment flow
   - Verify promo cards appear on customer home
   - Verify all PWA installs work (Android + iOS)
```

---

## Updated Folder Structure (additions only)

```
pharmabridge/
├── .claude/
│   └── skills/
│       ├── tech-stack.md         (existing)
│       ├── design-system.md      (existing)
│       ├── api-conventions.md    (existing)
│       ├── pwa-config.md         (existing)
│       ├── indian-market.md      (existing)
│       ├── appointments.md       ← NEW (create before Step 7)
│       └── promo-cards.md        ← NEW (create before Step 9)
│
├── packages/api/
│   └── src/
│       ├── routes/
│       │   ├── doctors.ts        ← NEW
│       │   ├── appointments.ts   ← NEW
│       │   ├── promo-cards.ts    ← NEW
│       │   └── pharmacy/
│       │       ├── doctors.ts    ← NEW
│       │       └── appointments.ts ← NEW
│       └── utils/
│           └── slots.ts          ← NEW (slot generation)
│
├── apps/customer/
│   └── src/
│       └── pages/
│           ├── Doctors.tsx       ← NEW
│           ├── DoctorProfile.tsx ← NEW
│           ├── Appointments.tsx  ← NEW
│           └── AppointmentDetail.tsx ← NEW
│
├── apps/pharmacy/
│   └── src/
│       └── pages/
│           ├── Doctors.tsx       ← NEW
│           ├── DoctorAdd.tsx     ← NEW
│           ├── DoctorAvailability.tsx ← NEW
│           └── Appointments.tsx  ← NEW
│
└── apps/admin/
    └── src/
        └── pages/
            ├── PromoCards.tsx    ← NEW
            ├── PromoCardEdit.tsx ← NEW
            └── Appointments.tsx  ← NEW
```

---

## New Environment Variables

Add to `packages/api/.env`:
```bash
# (no new external services required — appointments use existing DB + notifications)
# Promo cards are stored in DB — no new service needed
```

Add to `apps/customer/.env`:
```bash
# No new vars — promo cards fetched from same API
```

---

## Updated Launch Checklist

### Doctor Appointments
- [ ] Pharmacy can add doctor profiles with photos
- [ ] Pharmacy can set weekly availability schedule
- [ ] Customer can see available slots for any date
- [ ] Customer can book appointment (validated, no double-booking)
- [ ] Customer can cancel appointment (2hr rule enforced)
- [ ] Pharmacy gets real-time Socket.io notification on new booking
- [ ] Pharmacy can confirm/complete/mark no-show
- [ ] Appointment status updates push to customer in real-time
- [ ] Appointment cancellation window tested (< 2hr rejection works)

### Promo Cards
- [ ] Admin can create TEXT, IMAGE_PANEL, FULL_IMAGE cards
- [ ] Admin can set background colors for TEXT cards
- [ ] Admin can upload images for IMAGE_PANEL and FULL_IMAGE cards
- [ ] Admin can schedule cards (startAt/endAt)
- [ ] Admin can reorder cards via drag-and-drop
- [ ] Customer home shows promo carousel with auto-advance
- [ ] Swipe gesture works on mobile for carousel
- [ ] CTA links work (internal navigation + external URLs)
- [ ] Inactive or expired cards are not shown to customers

### PWA (all 3 apps)
- [ ] All 3 apps installable on Android Chrome
- [ ] All 3 apps installable on iOS Safari
- [ ] Offline page shows when network is lost
- [ ] Background sync retries failed order requests
- [ ] Service worker updates silently (autoUpdate mode)
- [ ] Lighthouse PWA score > 90 for all 3 apps
- [ ] All icons correct sizes and maskable icons work

---

*PharmaBridge Phase 3 — Extended Plan*
*Doctor Appointments + Promo Cards + PWA*
*Version 2.0 — May 2026*
