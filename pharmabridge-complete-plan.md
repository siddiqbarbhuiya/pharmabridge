# PharmaBridge — Complete Build Plan
### PWA Pharmacy Marketplace · India-First · Together.ai Aesthetic

---

## Table of Contents

1. [Project Vision & Brand Identity](#1-project-vision--brand-identity)
2. [Design System — Together.ai Inspired](#2-design-system--togetherai-inspired)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [Frontend — Customer PWA](#7-frontend--customer-pwa)
8. [Frontend — Pharmacy Panel](#8-frontend--pharmacy-panel)
9. [Frontend — Admin Panel](#9-frontend--admin-panel)
10. [Backend Services](#10-backend-services)
11. [Payment Integration](#11-payment-integration)
12. [Notifications & Real-time](#12-notifications--real-time)
13. [Security & Compliance](#13-security--compliance)
14. [Scalability & Deployment](#14-scalability--deployment)
15. [Claude Code Skills](#15-claude-code-skills)
16. [Step-by-Step Build Guide with Claude Code](#16-step-by-step-build-guide-with-claude-code)
17. [Folder Structure](#17-folder-structure)
18. [Environment Variables](#18-environment-variables)
19. [Launch Checklist](#19-launch-checklist)

---

## 1. Project Vision & Brand Identity

### App Name: **PharmaBridge**
**Tagline:** *Your health. Delivered.*

### Brand Personality
- **Trust** — clinical precision, never casual
- **Speed** — fast, reactive UI with zero lag feel
- **Accessibility** — works on 2G, offline-capable
- **Local-first** — neighbourhood pharmacy marketplace, not a megacorp

### Logo Placement (Critical — Together.ai Style)
Inspired by Together.ai's footer treatment:
- **Footer background**: Full-bleed dark section (`#0A0A0F`) with the **PharmaBridge wordmark rendered as a massive, low-opacity watermark** spanning ~80% of the footer width
- The wordmark sits at `opacity: 0.04–0.06`, rendered in white, font-size `clamp(6rem, 15vw, 14rem)`, absolutely positioned and centered vertically in the footer background
- Actual footer content (links, copyright, social) floats ABOVE this watermark at full opacity
- This creates the signature "brand as texture" effect seen on Together.ai
- Same treatment on the Customer PWA landing hero section: logo watermark bleeds behind hero content at `opacity: 0.03`

### Color Palette
```
--color-bg:           #08080E   /* near-black, cooler than pure black */
--color-surface:      #111118   /* card/panel background */
--color-border:       #1E1E2E   /* subtle borders */
--color-border-glow:  #2D2D4E   /* hover border state */
--color-accent:       #4ADE80   /* pharmacy green — primary CTA */
--color-accent-muted: #16A34A   /* darker green for hover */
--color-accent-blue:  #60A5FA   /* secondary accent — prescription, info */
--color-text-primary: #F1F5F9   /* headings */
--color-text-secondary:#94A3B8  /* body text */
--color-text-muted:   #475569   /* labels, captions */
--color-danger:       #F87171   /* errors, out-of-stock */
--color-warning:      #FBBF24   /* pending states */
--color-success:      #4ADE80   /* delivered, confirmed */
```

### Typography
```
Display / Hero:     "Instrument Serif" — elegant, medical editorial feel
Headings (H1–H3):  "DM Sans" — clean, modern, highly legible
Body / UI:         "Inter" — only for UI labels, never for marketing copy
Monospace:         "JetBrains Mono" — order IDs, medicine codes
```

### Motion Principles
- Page transitions: `opacity + translateY(12px)` — 200ms ease-out
- Cards: `scale(1.02)` on hover with `box-shadow` bloom — 150ms
- Buttons: Subtle `background` gradient shift on hover, no scale
- Loading: Skeleton shimmer using CSS `@keyframes` — never spinners
- Toast notifications: Slide in from bottom-right, auto-dismiss 3s

---

## 2. Design System — Together.ai Inspired

### Key Visual Signatures (from Together.ai)
1. **Dark-first**: Everything dark. No light mode at launch — adds complexity, ship dark first
2. **Grid texture**: Subtle `1px` grid pattern on hero backgrounds using SVG `<pattern>` or CSS `background-image`
3. **Card borders with glow**: `border: 1px solid var(--color-border)` + `box-shadow: 0 0 0 1px var(--color-border-glow)` on hover
4. **Section breathing**: Massive vertical padding (`120px–160px`) — sections breathe
5. **Large type contrast**: Hero headline at `clamp(3rem, 7vw, 6rem)` — dominant, commanding
6. **Muted badge pills**: Category tags, status badges — small, pill-shaped, `bg: rgba(255,255,255,0.06)`
7. **Footer watermark logo**: THE signature detail — see Section 1

### Component Inventory
```
Atoms:
  Button (primary/ghost/danger/icon)
  Input (text/OTP/search/file-upload)
  Badge (status: pending/confirmed/delivered/cancelled)
  Avatar (initials fallback)
  Spinner-skeleton (shimmer card)
  Toggle
  Chip (filter tags)

Molecules:
  MedicineCard
  OrderCard
  PharmacyCard
  PrescriptionUploader
  SearchBar (with GPS trigger)
  CartItem
  PaymentMethodSelector
  RatingStars

Organisms:
  Navbar (sticky, blur backdrop)
  Footer (with watermark logo)
  HeroSection
  MedicineGrid
  OrderTimeline
  CartDrawer (slide-in from right)
  PharmacyMap
  PrescriptionReviewModal
  CheckoutFlow (multi-step)
  DashboardStats (pharmacy/admin)
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS (PWA)                            │
│  Customer App  │  Pharmacy Panel  │  Admin Panel                │
│  (React PWA)   │   (React PWA)    │  (React PWA)                │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                     API GATEWAY (Nginx)                         │
│              Rate limiting · SSL termination · CORS             │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    BACKEND SERVICES (Node.js)                    │
│                                                                  │
│  Auth Service    Order Service    Pharmacy Service               │
│  Payment Svc     Notification Svc  Search Service                │
│  File/CDN Svc    Analytics Svc    Delivery Svc (optional)        │
└──────┬──────────────────┬───────────────────┬───────────────────┘
       │                  │                   │
┌──────▼──────┐  ┌────────▼───────┐  ┌───────▼──────────┐
│  PostgreSQL  │  │     Redis      │  │  Cloudinary/S3   │
│  (Primary)   │  │ (Cache+Queue)  │  │  (Files/Images)  │
└─────────────┘  └────────────────┘  └──────────────────┘
       │
┌──────▼──────┐
│ ElasticSearch│ (Medicine search, autocomplete)
└─────────────┘
```

### Monorepo Structure
Everything lives in one repository using **pnpm workspaces**:
- `apps/customer` — Customer PWA
- `apps/pharmacy` — Pharmacy Panel PWA
- `apps/admin` — Admin Panel PWA
- `packages/api` — Backend (Express/Fastify)
- `packages/ui` — Shared design system components
- `packages/types` — Shared TypeScript types
- `packages/config` — Shared configs (ESLint, Tailwind, etc.)

---

## 4. Technology Stack

### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, optimal bundle splitting |
| PWA | Vite PWA Plugin (Workbox) | Service worker, offline, install prompt |
| Routing | React Router v6 | Nested routes, lazy loading |
| State | Zustand + React Query | Server state + client state, no Redux bloat |
| Styling | Tailwind CSS + CSS Variables | Utility-first + design token system |
| Animation | Framer Motion | Page transitions, micro-interactions |
| Forms | React Hook Form + Zod | Type-safe validation |
| Maps | React Leaflet + OpenStreetMap | Free, no Google Maps cost |
| Charts | Recharts | Pharmacy/admin analytics |
| Icons | Lucide React | Clean, consistent |
| HTTP | Axios + React Query | Caching, background refetch |
| Auth | JWT + Refresh Token rotation | Stored in httpOnly cookies |

### Backend
| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Stable LTS |
| Framework | Fastify | 2x faster than Express, schema validation built-in |
| ORM | Prisma | Type-safe, migrations, great DX |
| Database | PostgreSQL 16 | ACID, relational, robust |
| Cache | Redis 7 | Sessions, rate limiting, queue |
| Queue | BullMQ (Redis) | Background jobs: notifications, analytics |
| Search | Elasticsearch / MeiliSearch | Medicine autocomplete & fuzzy search |
| Files | Cloudinary | Image transforms, CDN, free tier |
| Auth | Passport.js + JWT | OTP, email, social login |
| Realtime | Socket.io | Order tracking, live notifications |
| Validation | Zod | Shared with frontend via `packages/types` |

### Infrastructure
| Layer | Technology |
|---|---|
| Hosting | Railway.app or Render.com (easy start) → migrate to AWS/GCP |
| Database | Supabase (PostgreSQL managed) or Railway PostgreSQL |
| CDN | Cloudflare (free tier, critical for India latency) |
| Redis | Upstash (serverless Redis, generous free tier) |
| Monitoring | Sentry (errors) + Axiom (logs) |
| CI/CD | GitHub Actions |
| DNS | Cloudflare |

### Payment
| Provider | Purpose |
|---|---|
| Razorpay | UPI, Cards, Netbanking, Wallets, COD flag |
| Razorpay Webhook | Server-side payment confirmation |

### OTP / SMS
| Provider | Purpose |
|---|---|
| MSG91 / Twilio | OTP for phone login |
| Firebase Auth (optional) | Social login (Google) |

---

## 5. Database Schema

### Core Tables (PostgreSQL / Prisma)

```prisma
// packages/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────── USERS ───────────────
model User {
  id            String   @id @default(cuid())
  phone         String?  @unique
  email         String?  @unique
  name          String?
  avatar        String?
  role          UserRole @default(CUSTOMER)
  isVerified    Boolean  @default(false)
  isActive      Boolean  @default(true)
  fcmToken      String?
  addresses     Address[]
  orders        Order[]
  prescriptions Prescription[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum UserRole {
  CUSTOMER
  PHARMACY_OWNER
  DELIVERY_AGENT
  ADMIN
  SUPER_ADMIN
}

// ─────────────── ADDRESS ───────────────
model Address {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id])
  label      String  // "Home", "Work", "Other"
  line1      String
  line2      String?
  city       String
  state      String
  pincode    String
  lat        Float?
  lng        Float?
  isDefault  Boolean @default(false)
}

// ─────────────── PHARMACY ───────────────
model Pharmacy {
  id              String          @id @default(cuid())
  ownerId         String
  owner           User            @relation(fields: [ownerId], references: [id])
  name            String
  slug            String          @unique
  logo            String?
  licenseNumber   String          @unique
  licenseDocument String          // Cloudinary URL
  gstNumber       String?
  phone           String
  email           String
  addressLine1    String
  addressLine2    String?
  city            String
  state           String
  pincode         String
  lat             Float
  lng             Float
  status          PharmacyStatus  @default(PENDING)
  isOpen          Boolean         @default(true)
  openTime        String          @default("09:00")
  closeTime       String          @default("21:00")
  deliveryRadius  Int             @default(5) // km
  minOrderValue   Float           @default(0)
  commissionRate  Float           @default(10) // percentage
  medicines       Medicine[]
  orders          Order[]
  inventoryLogs   InventoryLog[]
  createdAt       DateTime        @default(now())
}

enum PharmacyStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

// ─────────────── MEDICINE ───────────────
model Medicine {
  id               String      @id @default(cuid())
  pharmacyId       String
  pharmacy         Pharmacy    @relation(fields: [pharmacyId], references: [id])
  name             String
  genericName      String?
  manufacturer     String?
  category         String
  description      String?
  dosage           String?
  sideEffects      String?
  composition      String?
  image            String?     // Cloudinary URL
  price            Float
  mrp              Float
  discountPercent  Float       @default(0)
  stockQuantity    Int
  unit             String      @default("strip")
  isPrescriptionRequired Boolean @default(false)
  isActive         Boolean     @default(true)
  barcode          String?
  hsn              String?     // HSN code for GST
  gstPercent       Float       @default(12)
  orderItems       OrderItem[]
  inventoryLogs    InventoryLog[]
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}

// ─────────────── ORDER ───────────────
model Order {
  id                String      @id @default(cuid())
  orderNumber       String      @unique // PB-2024-XXXXX
  customerId        String
  customer          User        @relation(fields: [customerId], references: [id])
  pharmacyId        String
  pharmacy          Pharmacy    @relation(fields: [pharmacyId], references: [id])
  items             OrderItem[]
  prescriptions     OrderPrescription[]
  status            OrderStatus @default(PENDING)
  paymentStatus     PaymentStatus @default(PENDING)
  paymentMethod     PaymentMethod
  razorpayOrderId   String?
  razorpayPaymentId String?
  subtotal          Float
  discount          Float       @default(0)
  deliveryFee       Float       @default(0)
  gstAmount         Float       @default(0)
  totalAmount       Float
  deliveryAddress   Json        // snapshot of address at order time
  notes             String?
  estimatedDelivery DateTime?
  deliveredAt       DateTime?
  timeline          OrderTimeline[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PRESCRIPTION_REQUIRED
  PROCESSING
  READY_FOR_PICKUP
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  UPI
  CARD
  NETBANKING
  WALLET
  COD
}

model OrderItem {
  id           String    @id @default(cuid())
  orderId      String
  order        Order     @relation(fields: [orderId], references: [id])
  medicineId   String
  medicine     Medicine  @relation(fields: [medicineId], references: [id])
  quantity     Int
  unitPrice    Float
  totalPrice   Float
  medicineName String    // snapshot at order time
}

model OrderTimeline {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  status    OrderStatus
  message   String?
  createdAt DateTime @default(now())
}

// ─────────────── PRESCRIPTION ───────────────
model Prescription {
  id           String              @id @default(cuid())
  userId       String
  user         User                @relation(fields: [userId], references: [id])
  fileUrl      String              // Cloudinary URL
  fileType     String              // image/pdf
  status       PrescriptionStatus  @default(PENDING)
  notes        String?
  orders       OrderPrescription[]
  createdAt    DateTime            @default(now())
}

enum PrescriptionStatus {
  PENDING
  VERIFIED
  REJECTED
}

model OrderPrescription {
  orderId        String
  prescriptionId String
  order          Order        @relation(fields: [orderId], references: [id])
  prescription   Prescription @relation(fields: [prescriptionId], references: [id])
  @@id([orderId, prescriptionId])
}

// ─────────────── INVENTORY LOG ───────────────
model InventoryLog {
  id          String   @id @default(cuid())
  pharmacyId  String
  pharmacy    Pharmacy @relation(fields: [pharmacyId], references: [id])
  medicineId  String
  medicine    Medicine @relation(fields: [medicineId], references: [id])
  changeType  String   // "RESTOCK", "SALE", "ADJUSTMENT"
  quantity    Int      // positive = added, negative = removed
  note        String?
  createdAt   DateTime @default(now())
}

// ─────────────── NOTIFICATIONS ───────────────
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  body      String
  type      String   // "ORDER_UPDATE", "OFFER", "SYSTEM"
  data      Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

// ─────────────── COMMISSION ───────────────
model Commission {
  id          String   @id @default(cuid())
  orderId     String   @unique
  pharmacyId  String
  orderTotal  Float
  rate        Float
  amount      Float
  status      String   @default("PENDING") // PENDING, PAID
  paidAt      DateTime?
  createdAt   DateTime @default(now())
}
```

---

## 6. API Design

### Base URL Structure
```
/api/v1/auth/*          — Authentication
/api/v1/users/*         — Customer profile
/api/v1/pharmacies/*    — Pharmacy CRUD + search
/api/v1/medicines/*     — Medicine catalog
/api/v1/orders/*        — Order lifecycle
/api/v1/prescriptions/* — Prescription management
/api/v1/payments/*      — Razorpay integration
/api/v1/admin/*         — Admin-only routes
/api/v1/analytics/*     — Pharmacy + admin analytics
/ws                     — WebSocket namespace
```

### Key Endpoints

```
POST   /auth/send-otp              — Send OTP to phone
POST   /auth/verify-otp            — Verify OTP, return JWT
POST   /auth/refresh               — Refresh access token
POST   /auth/logout                — Invalidate refresh token

GET    /pharmacies/nearby?lat=&lng=&radius= — GPS-based discovery
GET    /pharmacies/:slug            — Pharmacy detail + medicines
POST   /pharmacies                 — Register pharmacy (owner)
PATCH  /pharmacies/:id/status      — Admin: approve/reject

GET    /medicines/search?q=&categoryId=&pharmacyId= — Elasticsearch
GET    /medicines/:id              — Medicine detail
POST   /medicines                  — Pharmacy: add medicine
PATCH  /medicines/:id              — Pharmacy: update medicine
PATCH  /medicines/:id/stock        — Pharmacy: update stock

POST   /orders                     — Place order
GET    /orders/:id                 — Order detail + timeline
PATCH  /orders/:id/status          — Pharmacy: update status
POST   /orders/:id/cancel          — Customer: cancel order

POST   /prescriptions/upload       — Upload prescription (Cloudinary)
PATCH  /prescriptions/:id/verify   — Pharmacy: verify prescription

POST   /payments/create-order      — Create Razorpay order
POST   /payments/verify            — Verify payment signature
POST   /payments/webhook           — Razorpay webhook (server-to-server)

GET    /analytics/pharmacy/:id/sales — Sales by period
GET    /analytics/pharmacy/:id/top-medicines
GET    /admin/dashboard/stats
GET    /admin/orders               — All orders with filters
```

### Response Format (consistent across all endpoints)
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100, "limit": 20 },
  "message": "Optional human-readable message"
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "PRESCRIPTION_REQUIRED",
    "message": "One or more medicines require a valid prescription",
    "details": [...]
  }
}
```

---

## 7. Frontend — Customer PWA

### Pages & Routes
```
/                    — Landing / Home (GPS pharmacy discovery)
/search              — Medicine search results
/pharmacy/:slug      — Pharmacy detail + medicine catalog
/medicine/:id        — Medicine detail
/cart                — Cart (persisted in localStorage + Zustand)
/checkout            — Multi-step checkout
  /checkout/address
  /checkout/prescription
  /checkout/payment
  /checkout/confirm
/orders              — Order history
/orders/:id          — Order detail + live tracking
/prescriptions       — Prescription vault
/profile             — User profile
/notifications       — Notification center
/auth/login          — OTP login
```

### PWA Features
```
manifest.json:
  - name: "PharmaBridge"
  - short_name: "PharmaB"
  - theme_color: "#08080E"
  - background_color: "#08080E"
  - display: "standalone"
  - icons: [72, 96, 128, 144, 152, 192, 384, 512]

Service Worker (Workbox):
  - Cache-first: static assets, fonts, icons
  - Network-first: API calls
  - Background sync: failed orders/forms
  - Push notifications: FCM via service worker
  - Offline fallback page: "You're offline. Check your connection."
```

### Key Customer UX Details
- **GPS auto-detect** on homepage with "Allow location" prompt — attractive modal, not browser default
- **Prescription upload**: Drag-and-drop zone + camera capture (mobile) — shows upload progress, OCR hint text "Our pharmacist will verify within 30 mins"
- **Medicine card**: Shows availability badge, prescription-required lock icon, discount ribbon, "Add to cart" button — green glowing ring if in stock
- **Cart drawer**: Slides in from right, updates live with stock checks. Shows prescription requirement warning inline
- **Checkout**: 3 clear steps — Address → Prescription (if needed) → Payment. Progress bar at top
- **Order tracking**: Timeline component with status dots — `PENDING → CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED`. WebSocket live update
- **Nearby pharmacies**: Map view (Leaflet) + list toggle. Each pharmacy card shows open/closed status, delivery time estimate, distance
- **Search**: Instant search with MeiliSearch — typo-tolerant. Filters: category, prescription-only, price range, nearby pharmacies. Shows "Showing results from 3 nearby pharmacies"

---

## 8. Frontend — Pharmacy Panel

### Pages & Routes
```
/pharmacy/auth/login
/pharmacy/auth/register
/pharmacy/auth/pending  — Waiting for admin approval

/pharmacy/dashboard     — Stats overview
/pharmacy/orders        — Orders queue (real-time)
/pharmacy/orders/:id    — Order detail + prescription viewer
/pharmacy/medicines     — Inventory list
/pharmacy/medicines/add
/pharmacy/medicines/:id/edit
/pharmacy/inventory     — Stock management + alerts
/pharmacy/prescriptions — Prescriptions to verify
/pharmacy/analytics     — Sales charts
/pharmacy/profile       — Pharmacy profile + hours + delivery settings
```

### Key Pharmacy UX Details
- **Orders queue**: Split-pane — new orders on left, order detail on right. Real-time via WebSocket. Sound notification on new order (opt-in)
- **Prescription viewer**: Full-screen modal with zoom, rotate. Approve/reject with notes
- **Inventory alert**: Low stock (≤10 units) highlighted in amber. Out-of-stock in red. Restock button → quick update modal
- **Dashboard stats**: Cards — Today's Revenue, Pending Orders, Orders Delivered, Low Stock Items. Sparkline charts (Recharts)
- **Add medicine**: Searchable by generic name (auto-fill from national medicine database API), upload image, set price vs MRP

---

## 9. Frontend — Admin Panel

### Pages & Routes
```
/admin/dashboard
/admin/pharmacies        — All pharmacies + status
/admin/pharmacies/:id    — Pharmacy detail + approval action
/admin/customers         — All customers
/admin/orders            — All orders with advanced filters
/admin/orders/:id
/admin/medicines         — Global medicine catalog management
/admin/commissions       — Commission tracking + payouts
/admin/notifications     — Broadcast push notifications
/admin/analytics         — Platform-wide charts
/admin/settings          — Platform settings (commission rates, etc.)
```

### Key Admin UX Details
- **Pharmacy approval**: View license document (Cloudinary viewer), GST verification notes, approve/reject with reason — email + SMS notification sent automatically
- **Commission dashboard**: Table of pending/paid commissions per pharmacy per month. Bulk mark-paid action
- **Broadcast notifications**: Rich composer — title, body, target (all/customers/pharmacies/specific city), schedule (send now/later), preview

---

## 10. Backend Services

### Auth Service
```javascript
// OTP Flow
1. POST /auth/send-otp { phone }
   → Generate 6-digit OTP
   → Store in Redis with TTL 600s (10 min)
   → Send via MSG91
   → Return { requestId }

2. POST /auth/verify-otp { phone, otp, requestId }
   → Verify OTP from Redis
   → Create/fetch user
   → Issue accessToken (15min JWT) + refreshToken (30d, httpOnly cookie)
   → Return { user, accessToken }

3. POST /auth/refresh
   → Validate refreshToken from cookie
   → Issue new accessToken
   → Rotate refreshToken (new cookie)
```

### Order Service
```javascript
// Order State Machine
PENDING → CONFIRMED (pharmacy accepts)
PENDING → CANCELLED (pharmacy rejects / customer cancels)
CONFIRMED → PRESCRIPTION_REQUIRED (if Rx needed, not yet verified)
CONFIRMED → PROCESSING (pharmacy starts preparing)
PROCESSING → READY_FOR_PICKUP (if self-pickup)
PROCESSING → OUT_FOR_DELIVERY
OUT_FOR_DELIVERY → DELIVERED
Any state → CANCELLED (within cancellation window)
DELIVERED → REFUNDED (admin action)

// On each transition:
- Update OrderTimeline record
- Emit WebSocket event to customer
- Send push notification
- Trigger BullMQ job for emails
```

### Search Service (MeiliSearch)
```javascript
// Index: medicines
{
  searchableAttributes: ['name', 'genericName', 'manufacturer', 'category', 'composition'],
  filterableAttributes: ['pharmacyId', 'isPrescriptionRequired', 'isActive', 'category'],
  sortableAttributes: ['price', 'createdAt'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness']
}

// Sync: on medicine create/update/delete → update MeiliSearch index via BullMQ job
```

### File Service (Cloudinary)
```javascript
// Upload flow:
1. Client requests signed upload URL from backend
2. Backend generates Cloudinary signed URL (never expose API key to client)
3. Client uploads directly to Cloudinary
4. Client sends back the secure_url to backend to save in DB

// Transformations:
- Medicine images: w_400,h_400,c_fill,q_auto,f_auto
- Prescriptions: Keep original, watermark "Verified by PharmaBridge"
- Pharmacy logos: w_200,h_200,c_fill,q_auto,f_auto
```

### Notification Service
```javascript
// Channels:
1. Push (FCM) — order updates, offers
2. SMS (MSG91) — OTP, order confirmed, delivered
3. In-app — stored in Notification table, read via API
4. Email (optional later) — receipts, weekly summary

// BullMQ Jobs:
- send-push: { userId, title, body, data }
- send-sms: { phone, message }
- update-order-status: triggers above two
```

---

## 11. Payment Integration

### Razorpay Flow
```javascript
// 1. Customer clicks "Pay"
//    Frontend → POST /payments/create-order
//    Backend creates Razorpay order, returns { razorpayOrderId, amount, currency }

// 2. Frontend opens Razorpay checkout modal
const rzp = new Razorpay({
  key: RAZORPAY_KEY_ID,
  amount: totalAmount * 100, // paise
  currency: "INR",
  order_id: razorpayOrderId,
  name: "PharmaBridge",
  description: `Order #${orderNumber}`,
  image: "/logo-192.png",
  prefill: { name, email, contact: phone },
  theme: { color: "#4ADE80" },
  handler: function(response) {
    // Send to backend for verification
    POST /payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
  }
})

// 3. Backend verifies HMAC signature
// 4. On success → update Order paymentStatus = PAID, trigger order flow

// 5. Razorpay Webhook (backup):
//    POST /payments/webhook (Razorpay server → your server)
//    Handles: payment.captured, payment.failed, refund.processed
//    Always verify webhook signature
```

### COD Flow
```javascript
// COD orders skip payment step
// paymentStatus = PENDING until delivery
// On delivery → delivery agent marks as collected (optional)
// Or pharmacy marks order DELIVERED → admin manually marks payment received
```

---

## 12. Notifications & Real-time

### WebSocket Events (Socket.io)
```javascript
// Namespaces
/customer  — customer app connections
/pharmacy  — pharmacy panel connections
/admin     — admin panel connections

// Events: Customer receives
order:status_updated    { orderId, status, message, timestamp }
order:delivery_update   { orderId, lat, lng }  // optional delivery tracking
notification:new        { id, title, body, type }

// Events: Pharmacy receives
order:new               { order }  // sound alert
order:cancelled         { orderId, reason }

// Events: Admin receives
pharmacy:registration   { pharmacyId, name }
order:flagged           { orderId, reason }
```

### FCM Push Setup
```javascript
// Backend (Node.js firebase-admin SDK)
const message = {
  notification: { title, body },
  data: { orderId, type },
  token: user.fcmToken
}
await admin.messaging().send(message)

// Frontend service worker handles push when app is closed
self.addEventListener('push', (event) => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data
  })
})
```

---

## 13. Security & Compliance

### Security Checklist
- [ ] JWT stored as httpOnly cookie (not localStorage)
- [ ] Refresh token rotation on every use
- [ ] Rate limiting: 5 OTP requests per phone per hour (Redis)
- [ ] Rate limiting: 100 API requests per IP per minute (Nginx)
- [ ] Input validation via Zod on ALL endpoints
- [ ] SQL injection: impossible via Prisma parameterized queries
- [ ] XSS: React escapes by default; CSP headers via Nginx
- [ ] CORS: whitelist specific origins only
- [ ] Prescription files: access via signed URLs only (not public)
- [ ] Razorpay webhook: verify HMAC-SHA256 signature
- [ ] Sensitive routes: require re-verification for payment/profile changes
- [ ] Admin routes: IP whitelist + 2FA (TOTP)
- [ ] HTTPS only: enforced via Nginx + Cloudflare

### DPDP Act (India) Compliance
- Privacy policy clearly linked in footer
- Consent checkbox on registration
- Data deletion endpoint (`DELETE /users/me`)
- Prescription data: encrypted at rest (PostgreSQL transparent encryption)
- No prescription data shared without explicit consent

---

## 14. Scalability & Deployment

### Phase 1: Launch (0–1000 users)
```
Railway.app or Render.com:
  - 1x Node.js service (API)
  - 1x PostgreSQL (Railway managed)
  - 1x Redis (Upstash)
  - MeiliSearch (cloud.meilisearch.com free tier)
  - Cloudinary (free tier: 25GB storage)
  - Cloudflare (free CDN + DDoS)
  - Vercel (PWA static hosting — free)
```

### Phase 2: Growth (1000–50000 users)
```
Add:
  - Horizontal scaling: 2-3x API instances behind Nginx
  - PostgreSQL read replica
  - Redis cluster
  - Add BullMQ workers as separate process
  - Upgrade to paid Cloudinary plan
  - Add monitoring: Sentry + Axiom
```

### Phase 3: Scale (50000+ users)
```
Migrate to AWS/GCP:
  - ECS Fargate or GKE for containers
  - RDS PostgreSQL Multi-AZ
  - ElastiCache Redis
  - S3 + CloudFront instead of Cloudinary for costs
  - Microservices split if needed
  - Add DataDog / New Relic APM
```

### Performance Targets
- FCP (First Contentful Paint): < 1.5s on 4G
- TTI (Time to Interactive): < 3s on 4G
- Core Web Vitals: All green
- PWA Lighthouse Score: > 90
- API P99 latency: < 200ms
- Uptime SLA: 99.5% (Phase 1)

---

## 15. Claude Code Skills

Create these skill files in your project at `.claude/skills/` before starting:

### Skill 1: `tech-stack.md`
```markdown
# PharmaBridge Tech Stack

## Monorepo
- pnpm workspaces
- Turborepo for build caching
- Root: package.json with workspace scripts

## Frontend (all apps)
- React 18 + Vite + TypeScript
- Tailwind CSS (config in packages/config/tailwind.config.js)
- Framer Motion for animations
- React Router v6
- Zustand for client state
- React Query (TanStack Query v5) for server state
- React Hook Form + Zod validation
- Axios for HTTP (with interceptors for JWT refresh)
- Lucide React for icons
- Recharts for charts
- React Leaflet for maps

## Backend
- Node.js 20 + Fastify + TypeScript
- Prisma ORM (PostgreSQL)
- Redis (ioredis)
- BullMQ for queues
- Socket.io for realtime
- Cloudinary SDK for file uploads
- firebase-admin for FCM push
- Razorpay SDK
- MSG91 for SMS

## Shared packages
- packages/types: Zod schemas + TypeScript types used by both frontend and backend
- packages/ui: React component library
- packages/config: Shared eslint, tailwind, tsconfig

## Always use TypeScript. Never use JavaScript files.
## Always use async/await, never .then() chains.
## Always validate with Zod. Never trust raw request bodies.
```

### Skill 2: `design-system.md`
```markdown
# PharmaBridge Design System

## Theme: Dark-first, Together.ai inspired
- Background: #08080E
- Surface: #111118
- Border: #1E1E2E
- Accent (green): #4ADE80
- Accent (blue): #60A5FA
- Text primary: #F1F5F9
- Text secondary: #94A3B8

## Typography
- Display: "Instrument Serif" (Google Fonts)
- Headings: "DM Sans" (Google Fonts)
- Body/UI: "Inter" (Google Fonts)
- Mono: "JetBrains Mono" (Google Fonts)

## CRITICAL: Footer Logo Watermark
Every page with a footer MUST implement:
- Large brand wordmark "PharmaBridge" as absolutely positioned background element
- Font size: clamp(6rem, 15vw, 14rem)
- Color: white at opacity 0.04
- Positioned: centered, bottom-aligned behind footer content
- This is our signature visual identity element — never skip it

## Component Patterns
- Cards: bg-[#111118] border border-[#1E1E2E] rounded-xl hover:border-[#2D2D4E]
- Buttons primary: bg-[#4ADE80] text-[#08080E] font-semibold
- Buttons ghost: border border-[#1E1E2E] hover:border-[#4ADE80] text-[#F1F5F9]
- Inputs: bg-[#111118] border border-[#1E1E2E] focus:border-[#4ADE80] text-[#F1F5F9]
- Grid texture on hero: SVG pattern background, opacity 0.03

## Animations
- Page mount: opacity 0→1 + translateY(12px→0), duration 200ms
- Card hover: scale(1.02) + box-shadow glow, duration 150ms
- No spinners. Use skeleton shimmer loaders (CSS @keyframes shimmer)
```

### Skill 3: `api-conventions.md`
```markdown
# API Conventions

## Response format (always)
{ success: boolean, data: any, meta?: { page, total, limit }, message?: string }

## Error format (always)
{ success: false, error: { code: string, message: string, details?: any[] } }

## Error codes (use these exact strings)
INVALID_OTP, OTP_EXPIRED, UNAUTHORIZED, FORBIDDEN, NOT_FOUND,
VALIDATION_ERROR, STOCK_UNAVAILABLE, PRESCRIPTION_REQUIRED,
PAYMENT_FAILED, PHARMACY_CLOSED, ORDER_CANNOT_BE_CANCELLED

## Auth
- Access token: Bearer in Authorization header
- Refresh token: httpOnly cookie named "pb_refresh_token"
- Protected routes use authenticateUser middleware
- Pharmacy routes use requirePharmacyOwner middleware
- Admin routes use requireAdmin middleware

## Pagination
- All list endpoints support: ?page=1&limit=20&sortBy=createdAt&sortOrder=desc
- Always return meta.total for frontend pagination

## File uploads
- Never accept file directly in API
- Return signed Cloudinary upload URL
- Client uploads to Cloudinary directly
- Client sends back the secure_url string

## Database
- Use Prisma transactions for multi-table writes
- Never expose internal IDs unnecessarily
- Always soft-delete (isActive = false) never hard delete medicines/users
```

### Skill 4: `pwa-config.md`
```markdown
# PWA Configuration

## Service Worker (Workbox via vite-plugin-pwa)
- Cache strategy: CacheFirst for static assets (CSS, JS, fonts, images)
- Cache strategy: NetworkFirst for API calls
- Offline fallback: /offline.html
- Background sync: for failed API calls (order placement)
- Push notifications: FCM

## Manifest
- theme_color: #08080E
- background_color: #08080E
- display: standalone
- orientation: portrait (mobile-first)
- icons: generate all sizes from /public/icon-512.png

## Install Prompt
- Show custom install banner after 30s on landing page (not browser default)
- Show again after 7 days if dismissed
- Track installs in analytics

## Performance
- Code splitting: each route is a lazy() import
- Images: use <img loading="lazy"> and Cloudinary auto-format (f_auto,q_auto)
- Fonts: preload in <head>, font-display: swap
- Prefetch next likely routes on hover

## Lighthouse targets
- Performance: >90
- PWA: >90
- Accessibility: >85
- SEO: >80
```

### Skill 5: `indian-market.md`
```markdown
# India-Specific Requirements

## Payment
- Razorpay is the primary gateway (UPI is CRITICAL for India)
- Always show UPI as first payment option
- COD is essential — many users don't have cards
- Amount always in INR (₹), paise for Razorpay API (multiply by 100)

## Phone Numbers
- Format: +91 XXXXXXXXXX (10 digits after country code)
- OTP via MSG91 (or Twilio India)
- Validate: /^[6-9]\d{9}$/ (Indian mobile numbers start with 6-9)

## Language
- English only at launch. Plan for Hindi later.
- Date format: DD/MM/YYYY (not MM/DD/YYYY)
- Distance: km (not miles)
- Weight: grams/kg

## Compliance
- Drug pricing: show MRP prominently, discount below
- Prescription medicines: strict Rx verification workflow
- GST: 12% on most medicines, 5% on some. Store HSN code per medicine
- DPDP Act: explicit consent on registration

## Performance for India
- Target 2G-capable: total JS bundle < 200KB gzipped
- Use Cloudflare for CDN (servers in Mumbai, Chennai)
- Lazy load everything below the fold
- MeiliSearch hosted in India region if possible

## Maps
- Use OpenStreetMap / Leaflet (free, no billing surprises)
- Geocoding: use Nominatim (OSM) or Mapbox free tier
- Default map center: India (20.5937° N, 78.9629° E), zoom 5
```

---

## 16. Step-by-Step Build Guide with Claude Code

### Prerequisites: Install Claude Code
```bash
npm install -g @anthropic/claude-code
# or
npx @anthropic/claude-code
```

### Phase 0: Project Setup (Day 1)

**Step 1: Initialize monorepo**
```bash
mkdir pharmabridge && cd pharmabridge
git init
```

Prompt Claude Code:
```
Create a pnpm monorepo with Turborepo for a project called PharmaBridge.
Structure:
  apps/customer (React 18 + Vite + TypeScript + TailwindCSS + Framer Motion)
  apps/pharmacy (React 18 + Vite + TypeScript + TailwindCSS)
  apps/admin    (React 18 + Vite + TypeScript + TailwindCSS)
  packages/api  (Node.js 20 + Fastify + TypeScript)
  packages/ui   (React component library, no framework)
  packages/types (Zod schemas + TypeScript types)
  packages/config (shared tailwind.config.js, eslint.config.js, tsconfig.json)

Include:
- Root package.json with workspace scripts (dev, build, lint, test)
- turbo.json with pipeline configuration
- .gitignore
- Prettier config
- ESLint config

Read the skill files at .claude/skills/ before starting.
```

**Step 2: Set up Design System**

Prompt Claude Code:
```
In packages/ui, create the PharmaBridge design system.
Read .claude/skills/design-system.md first.

Create:
1. CSS variables file with the full color palette and typography tokens
2. Tailwind config extending with custom colors and fonts
3. Base components: Button, Input, Badge, Card, Skeleton, Toggle, Chip
4. Typography components: Heading, Text, Mono
5. Layout components: Container, Section, Divider
6. The Footer component with the CRITICAL watermark logo implementation
7. The Navbar component (sticky, blur backdrop, mobile hamburger)
8. Export all from packages/ui/index.ts

Follow the design-system.md skill exactly. The footer watermark is mandatory.
```

**Step 3: Set up shared types**

Prompt Claude Code:
```
In packages/types, create Zod schemas for all entities.
Read .claude/skills/api-conventions.md.

Create schemas for: User, Address, Pharmacy, Medicine, Order, OrderItem,
Prescription, Notification, Commission.

Also create: API response wrapper schemas, pagination schemas,
all enum types matching the Prisma schema.

Export everything from packages/types/index.ts.
Types must be usable in both frontend and backend.
```

---

### Phase 1: Backend Foundation (Days 2–4)

**Step 4: Fastify server + Prisma**

Prompt Claude Code:
```
In packages/api, set up the Fastify server with TypeScript.

1. Install: fastify, @fastify/cors, @fastify/cookie, @fastify/jwt,
   @fastify/multipart, @fastify/rate-limit, prisma, @prisma/client,
   ioredis, zod, pino

2. Create prisma/schema.prisma with the FULL schema from the project plan
   (all tables: User, Address, Pharmacy, Medicine, Order, OrderItem,
   OrderTimeline, Prescription, OrderPrescription, InventoryLog,
   Notification, Commission)

3. Create src/server.ts — Fastify instance with all plugins registered
4. Create src/config.ts — env variable validation with Zod
5. Create src/plugins/ — auth.plugin.ts, redis.plugin.ts, prisma.plugin.ts
6. Create src/middleware/ — authenticate.ts, requireRole.ts
7. Create src/utils/ — response.ts (standard response formatter), errors.ts

Follow api-conventions.md. Run prisma migrate dev to validate schema.
```

**Step 5: Auth service**

Prompt Claude Code:
```
In packages/api, implement the authentication system.
Read .claude/skills/api-conventions.md and .claude/skills/indian-market.md.

Implement:
1. POST /api/v1/auth/send-otp
   - Validate Indian phone number format
   - Generate 6-digit OTP
   - Store in Redis with 10min TTL (key: otp:{phone})
   - Rate limit: 5 attempts per phone per hour
   - Log to console (skip actual SMS for now, add MSG91 later)
   - Return { requestId: uuid, expiresIn: 600 }

2. POST /api/v1/auth/verify-otp
   - Validate OTP from Redis
   - Delete OTP after successful verification
   - Create user if new, fetch if existing
   - Issue JWT accessToken (15min) + refreshToken (30d, httpOnly cookie)
   - Return { user, accessToken }

3. POST /api/v1/auth/refresh
   - Read pb_refresh_token cookie
   - Validate + rotate refresh token
   - Return new accessToken

4. POST /api/v1/auth/logout
   - Clear cookie + invalidate refresh token in Redis

Include Zod validation on all request bodies.
```

**Step 6: Medicine + Pharmacy APIs**

Prompt Claude Code:
```
In packages/api, implement pharmacy and medicine routes.
Read all skills in .claude/skills/.

1. Pharmacy routes (src/routes/pharmacies.ts):
   - GET /pharmacies/nearby?lat=&lng=&radius= — filter by PostGIS distance or manual lat/lng calc
   - GET /pharmacies/:slug — details + featured medicines
   - POST /pharmacies — register (authenticated, creates PENDING pharmacy)
   - PATCH /pharmacies/:id/status — admin only: approve/reject

2. Medicine routes (src/routes/medicines.ts):
   - GET /medicines/search?q= — MeiliSearch integration
   - GET /medicines/:id — detail
   - POST /medicines — pharmacy owner only
   - PATCH /medicines/:id — pharmacy owner only
   - PATCH /medicines/:id/stock — pharmacy owner only (quick stock update)
   - DELETE /medicines/:id — soft delete (isActive = false)

3. Prescription routes (src/routes/prescriptions.ts):
   - POST /prescriptions/upload — return Cloudinary signed URL
   - GET /prescriptions — user's prescriptions
   - PATCH /prescriptions/:id/verify — pharmacy: approve/reject

All routes must use Zod for request validation.
All responses must use the standard response format.
```

**Step 7: Orders + Payments**

Prompt Claude Code:
```
In packages/api, implement order and payment routes.
Read .claude/skills/api-conventions.md and .claude/skills/indian-market.md.

1. Order routes (src/routes/orders.ts):
   - POST /orders — place order (validate stock, check Rx required, calc totals)
   - GET /orders — customer's orders (paginated)
   - GET /orders/:id — order detail + timeline
   - PATCH /orders/:id/status — pharmacy only (state machine validation)
   - POST /orders/:id/cancel — customer (only if PENDING or CONFIRMED)

2. Order number format: PB-YYYY-XXXXX (e.g., PB-2024-00001, auto-increment)

3. Payment routes (src/routes/payments.ts):
   - POST /payments/create-order — create Razorpay order, return { razorpayOrderId, amount }
   - POST /payments/verify — verify Razorpay signature (crypto HMAC)
   - POST /payments/webhook — Razorpay webhook (verify signature, handle events)

4. On order status change:
   - Insert into OrderTimeline
   - Emit Socket.io event to customer namespace (room: userId)
   - Queue BullMQ job: send-push-notification

5. Install: razorpay package
```

**Step 8: WebSocket + Notifications**

Prompt Claude Code:
```
In packages/api, add Socket.io and the notification system.

1. Add Socket.io to Fastify server
   - Namespaces: /customer, /pharmacy, /admin
   - Auth middleware: validate JWT on connection
   - Rooms: users join room `user:{userId}`, pharmacies join `pharmacy:{pharmacyId}`

2. Create src/services/notification.service.ts:
   - sendPush(userId, title, body, data): FCM via firebase-admin
   - saveToDB(userId, title, body, type, data): insert Notification record
   - emitSocket(namespace, room, event, data): emit to Socket.io room

3. Create BullMQ queues in src/queues/:
   - notification.queue.ts: process send-push jobs
   - Create worker that processes these jobs

4. Notification routes:
   - GET /notifications — user's notifications (paginated, unread first)
   - PATCH /notifications/:id/read
   - PATCH /notifications/read-all
```

---

### Phase 2: Customer PWA (Days 5–9)

**Step 9: Customer app setup + routing**

Prompt Claude Code:
```
In apps/customer, set up the React PWA with full routing.
Read .claude/skills/pwa-config.md and .claude/skills/design-system.md.

1. Install vite-plugin-pwa, configure PWA manifest (dark theme: #08080E)
2. Set up React Router v6 with all customer routes (lazy loaded):
   /, /search, /pharmacy/:slug, /medicine/:id, /cart,
   /checkout, /checkout/address, /checkout/prescription, /checkout/payment,
   /orders, /orders/:id, /prescriptions, /profile, /auth/login
3. Set up Zustand stores:
   - authStore: user, accessToken, login, logout
   - cartStore: items, addItem, removeItem, updateQty, clear (persisted)
   - locationStore: lat, lng, hasPermission, requestLocation
4. Set up React Query client with global error handling
5. Set up Axios instance with JWT interceptor (auto-refresh on 401)
6. Set up Framer Motion page transition wrapper
7. Create offline fallback page (branded, dark theme)
8. Import all components from packages/ui
```

**Step 10: Landing page + pharmacy discovery**

Prompt Claude Code:
```
In apps/customer/src/pages/Home.tsx, build the landing page.
Read .claude/skills/design-system.md carefully.

Design requirements:
1. Hero section:
   - Full viewport height
   - Subtle SVG grid pattern background (1px grid, opacity 0.03)
   - Large headline: "Medicine delivered from your local pharmacy" in Instrument Serif
   - Subheadline in DM Sans
   - GPS location button (green, glowing) + manual pincode input
   - Brand watermark logo in hero background (opacity 0.03)

2. Pharmacy discovery section (loads after GPS):
   - Map (React Leaflet) showing nearby pharmacies with custom markers
   - List/grid toggle
   - PharmacyCard components: name, distance, open/closed badge, rating, delivery time
   - "Showing X pharmacies within Y km" label

3. Popular categories section:
   - Horizontal scroll on mobile
   - Icon + label chips (Pain Relief, Diabetes, Vitamins, Skincare, etc.)

4. Footer with MANDATORY watermark logo treatment

Implement GPS detection automatically on page load with permission prompt modal.
```

**Step 11: Medicine search + pharmacy detail**

Prompt Claude Code:
```
Build the search and pharmacy detail pages in apps/customer.

1. /search page:
   - Instant search input (debounced 300ms) → hits MeiliSearch via API
   - Skeleton loaders while fetching
   - Filter sidebar: category, prescription-required toggle, price range slider, pharmacy selector
   - MedicineCard grid: name, pharmacy, price, MRP with strikethrough, discount badge, "Add to Cart" button
   - Empty state: "No medicines found. Try a different search." with illustration

2. /pharmacy/:slug page:
   - Pharmacy header: logo, name, rating, distance, open/close status, delivery info
   - Medicine catalog with category tabs
   - Search within pharmacy
   - "Prescription Required" section clearly separated

3. /medicine/:id page:
   - Large medicine image
   - Name, generic name, manufacturer
   - Price vs MRP, discount
   - Dosage, composition, side effects (collapsible)
   - Prescription required warning (amber banner)
   - Quantity selector + Add to Cart button
   - Related medicines from same pharmacy
```

**Step 12: Cart + Checkout flow**

Prompt Claude Code:
```
Build the cart drawer and multi-step checkout in apps/customer.

1. CartDrawer (slide-in from right, 400px wide on desktop, full-screen on mobile):
   - Lists cart items with quantity controls
   - Stock validation (show "Only X left" warnings)
   - Prescription required warning per item
   - Subtotal, estimated delivery fee
   - "Checkout" CTA button

2. Checkout flow (3 steps with progress bar):
   Step 1 - Address:
     - List user's saved addresses
     - "Add new address" form with map pin
     - Default address pre-selected

   Step 2 - Prescription:
     - Only shown if cart has Rx-required medicines
     - "Upload new prescription" (drag-drop + camera)
     - "Use saved prescription" from vault
     - Cloudinary direct upload with progress bar

   Step 3 - Payment:
     - Order summary card
     - Payment method selection: UPI (first), Cards, Netbanking, Wallet, COD
     - Razorpay modal opens on "Pay ₹XXX"
     - COD: direct order placement

3. Order confirmation page:
   - Success animation (Framer Motion)
   - Order number prominently displayed
   - Estimated delivery time
   - "Track Order" and "Continue Shopping" buttons
```

**Step 13: Order tracking + profile**

Prompt Claude Code:
```
Build order tracking and profile pages in apps/customer.

1. /orders page:
   - Tabs: Active Orders | Past Orders
   - OrderCard: order number, pharmacy name, items count, total, status badge, date
   - Real-time status update via Socket.io

2. /orders/:id page:
   - Order header: number, date, total
   - OrderTimeline component:
     - Vertical timeline with status dots
     - Each step: icon + label + timestamp
     - Active step: pulsing green dot
     - Steps: Order Placed → Confirmed → Processing → Out for Delivery → Delivered
   - Items list with images
   - Prescription viewer (if applicable)
   - "Cancel Order" button (only if status is PENDING)
   - Invoice download button

3. /prescriptions page:
   - Grid of uploaded prescriptions
   - Status badge: Pending / Verified / Rejected
   - Upload new prescription button
   - Click to view full size

4. /profile page:
   - Avatar (initials) + name + phone
   - Edit profile form
   - Saved addresses list
   - Notification preferences toggle
   - Logout button

Connect all Socket.io events for real-time order status updates.
```

---

### Phase 3: Pharmacy Panel (Days 10–13)

**Step 14: Pharmacy registration + dashboard**

Prompt Claude Code:
```
In apps/pharmacy, build the pharmacy panel.
Read .claude/skills/design-system.md — same dark theme applies.

1. Registration flow:
   - Step 1: Owner details (name, phone, email)
   - Step 2: Pharmacy details (name, address, GPS pin on map)
   - Step 3: License upload (drug license + GST certificate)
   - Step 4: Bank details (for commission payouts)
   - Pending approval page with status tracking

2. Dashboard (after approval):
   - Stats cards row: Today's Revenue (₹), Pending Orders, Delivered Today, Low Stock Alerts
   - Sparkline charts per stat
   - Recent orders list (last 10)
   - Quick actions: Add Medicine, Update Stock, View All Orders

3. All pages use same design system (dark theme, same typography)
4. Pharmacy-specific accent: keep green #4ADE80 for CTAs
```

**Step 15: Orders management**

Prompt Claude Code:
```
In apps/pharmacy, build the orders management system.

1. /pharmacy/orders page (real-time order queue):
   - Split pane layout (desktop): order list left (300px) | order detail right
   - Mobile: list view → tap → detail view
   - Order list tabs: New (badge count) | Processing | Ready | All
   - Each list item: order number, customer name, items count, total, time ago
   - New orders: highlighted with green left border + sound notification (opt-in toggle)
   - Socket.io: auto-refresh list on new order event

2. Order detail panel:
   - Full order details: items, quantities, customer address
   - Prescription viewer (inline if PDF/image)
   - Action buttons based on status:
     PENDING: "Accept Order" (green) | "Reject" (red, with reason modal)
     CONFIRMED: "Start Processing"
     PROCESSING: "Ready for Delivery" | "Mark Ready for Pickup"
     OUT_FOR_DELIVERY: "Mark Delivered"
   - Notes field for internal use
   - Customer contact (masked phone for privacy)

3. Socket.io integration for real-time updates
```

**Step 16: Inventory management**

Prompt Claude Code:
```
In apps/pharmacy, build the inventory management system.

1. /pharmacy/medicines page:
   - Searchable, sortable table of all medicines
   - Columns: Image, Name, Category, Price, MRP, Stock, Status, Actions
   - Stock status: color-coded (green >20, amber 1-20, red 0)
   - Bulk actions: activate/deactivate, export CSV
   - "Add Medicine" button → modal or page

2. Add/Edit Medicine form:
   - Search by generic name (auto-fill from suggestion)
   - Fields: name, genericName, manufacturer, category, description
   - Pricing: price, MRP (validate price ≤ MRP), discountPercent (auto-calc)
   - Stock: quantity, unit (strip/tablet/ml/bottle)
   - Flags: isPrescriptionRequired toggle, isActive toggle
   - Image upload (Cloudinary direct upload)
   - GST: percent, HSN code

3. /pharmacy/inventory page:
   - Low stock alerts (≤10 units) — prominent amber cards
   - Quick stock update: inline number input + save
   - Inventory log table: date, change type, quantity change, note
   - Export inventory CSV
```

---

### Phase 4: Admin Panel (Days 14–16)

**Step 17: Admin panel**

Prompt Claude Code:
```
In apps/admin, build the admin panel.
Same design system. Add a red/amber accent for admin actions.

1. /admin/dashboard:
   - Platform stats: Total Orders, Total Revenue, Active Pharmacies, Registered Users
   - Charts: Orders over time, Revenue over time, New registrations
   - Recent flagged items (pending approvals)

2. /admin/pharmacies:
   - Table: pharmacy name, owner, city, status, registration date, actions
   - Filter by status (Pending / Approved / Suspended)
   - Click → detail page

3. /admin/pharmacies/:id:
   - All pharmacy details
   - View license document (Cloudinary viewer with zoom)
   - Commission rate edit
   - Approve button (green) / Reject button (red, require reason textarea)
   - Suspend / Reinstate toggle
   - On action → send notification to pharmacy owner automatically

4. /admin/orders:
   - All orders across all pharmacies
   - Advanced filters: date range, pharmacy, status, payment method
   - Export to CSV
   - Click → order detail (same as pharmacy order detail but read-only)

5. /admin/commissions:
   - Table: pharmacy, month, orders count, total sales, commission rate, commission amount, status
   - Bulk "Mark Paid" action
   - Filters by pharmacy, month, status

6. /admin/notifications:
   - Broadcast composer: title, body, target audience selector, schedule
   - Sent notifications history
```

---

### Phase 5: Polish & Launch (Days 17–20)

**Step 18: Performance + PWA audit**

Prompt Claude Code:
```
Run a performance audit on all three PWA apps and fix issues.

1. Run Lighthouse in CI mode on each app
2. Ensure all routes are code-split (lazy imports)
3. Add resource hints: <link rel="preconnect"> for API, fonts, Cloudinary
4. Verify service worker caches correctly
5. Test offline mode: simulate offline in DevTools, verify offline page shows
6. Verify web app manifest: installable, correct icons, theme color
7. Add skeleton loaders to all loading states (remove any spinners)
8. Verify Framer Motion page transitions work on all routes
9. Verify footer watermark logo is present on all pages with footer
10. Run bundle analyzer, ensure gzipped JS < 200KB per app
```

**Step 19: Error handling + edge cases**

Prompt Claude Code:
```
Implement comprehensive error handling across the full stack.

Frontend:
1. Global error boundary component (branded error page, not default React error)
2. React Query global error handler: show toast on API error
3. Network error detection: show "Check your connection" toast
4. Form validation errors: inline, with smooth animation
5. 404 page: branded, with navigation back to home
6. Empty states for every list (orders, medicines, prescriptions)

Backend:
1. Fastify global error handler: always return standard error format
2. Prisma error handling: P2002 (unique violation), P2025 (not found) → friendly messages
3. Unhandled promise rejections: catch + log to Sentry
4. Rate limit exceeded: return 429 with retry-after header
5. Validation errors: return 400 with Zod error details formatted nicely
```

**Step 20: Testing + deployment**

Prompt Claude Code:
```
Set up testing and prepare for deployment.

1. Backend tests (Vitest):
   - Auth flow: send-otp, verify-otp, refresh
   - Order state machine: valid and invalid transitions
   - Payment webhook signature verification
   - Razorpay mock

2. Frontend tests (Vitest + React Testing Library):
   - CartStore: add, remove, update quantity
   - CheckoutFlow: step navigation
   - OTP input component

3. GitHub Actions CI:
   - Run lint + typecheck on PR
   - Run tests on PR
   - Deploy to staging on merge to main

4. Production deployment:
   - Railway.app: deploy packages/api with env vars
   - Vercel: deploy apps/customer, apps/pharmacy, apps/admin
   - Set environment variables from .env.example
   - Run prisma migrate deploy on Railway
   - Verify all health checks pass
   - Test end-to-end: register customer → browse pharmacy → order → pharmacy confirms → delivered
```

---

## 17. Folder Structure

```
pharmabridge/
├── .claude/
│   └── skills/
│       ├── tech-stack.md
│       ├── design-system.md
│       ├── api-conventions.md
│       ├── pwa-config.md
│       └── indian-market.md
├── apps/
│   ├── customer/
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   ├── offline.html
│   │   │   └── icons/ (all PWA icon sizes)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── stores/       (Zustand)
│   │   │   ├── hooks/
│   │   │   ├── services/     (API calls)
│   │   │   ├── utils/
│   │   │   └── App.tsx
│   │   └── vite.config.ts
│   ├── pharmacy/
│   │   └── (same structure)
│   └── admin/
│       └── (same structure)
├── packages/
│   ├── api/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   ├── plugins/
│   │   │   ├── queues/
│   │   │   ├── utils/
│   │   │   └── server.ts
│   │   └── package.json
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── tokens/       (CSS variables)
│   │   │   └── index.ts
│   │   └── package.json
│   ├── types/
│   │   ├── src/
│   │   │   ├── schemas/      (Zod schemas)
│   │   │   └── index.ts
│   │   └── package.json
│   └── config/
│       ├── tailwind.config.js
│       ├── eslint.config.js
│       └── tsconfig.base.json
├── package.json            (workspace root)
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

---

## 18. Environment Variables

```bash
# packages/api/.env

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pharmabridge"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_ACCESS_SECRET="your-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Razorpay
RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXX"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"

# MSG91 (SMS)
MSG91_AUTH_KEY="your-msg91-key"
MSG91_TEMPLATE_ID="your-otp-template-id"

# Firebase (FCM)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# MeiliSearch
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_KEY="your-master-key"

# App
NODE_ENV="development"
PORT="3001"
FRONTEND_URLS="http://localhost:5173,http://localhost:5174,http://localhost:5175"
COOKIE_DOMAIN="localhost"

# apps/customer/.env
VITE_API_URL="http://localhost:3001"
VITE_RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXX"
VITE_SOCKET_URL="http://localhost:3001"
VITE_MEILISEARCH_HOST="http://localhost:7700"
VITE_MEILISEARCH_KEY="your-search-only-key"
VITE_CLOUDINARY_CLOUD_NAME="your-cloud-name"
VITE_CLOUDINARY_UPLOAD_PRESET="pharmabridge-unsigned"
```

---

## 19. Launch Checklist

### Pre-launch
- [ ] All three PWA apps pass Lighthouse PWA audit
- [ ] Service worker tested: install, offline, background sync
- [ ] Payment flow tested end-to-end in Razorpay test mode
- [ ] OTP flow tested with real phone number
- [ ] Prescription upload tested (image + PDF)
- [ ] Order state machine tested all transitions
- [ ] WebSocket real-time updates tested
- [ ] Footer watermark logo present on all pages ✓
- [ ] Mobile responsive: tested on iPhone SE, Pixel 5, Samsung S21
- [ ] Dark theme consistent across all three apps
- [ ] Error pages: 404, 500, offline all branded
- [ ] Privacy policy + Terms pages linked in footer
- [ ] CORS configured for production domains
- [ ] Rate limiting active on all auth endpoints
- [ ] Razorpay webhook URL registered in Razorpay dashboard
- [ ] FCM push notifications tested on Android + iOS (PWA)
- [ ] Admin: at least one admin user seeded in DB
- [ ] Commission rates configured in admin
- [ ] At least one test pharmacy approved + medicines added
- [ ] Cloudflare DNS + SSL configured

### Post-launch (Week 1)
- [ ] Monitor Sentry for errors
- [ ] Monitor API P99 latency
- [ ] Check Razorpay dashboard for payment success rates
- [ ] Review low-stock alerts are working
- [ ] Collect first user feedback

---

*PharmaBridge — Built with Claude Code, designed for India.*
*Version 1.0 Plan — May 2026*
