# PharmaBridge Tech Stack

## Monorepo Setup
- pnpm workspaces (pnpm-workspace.yaml)
- Turborepo for build caching (turbo.json)
- Root package.json with workspace scripts: dev, build, lint, test, typecheck

## Frontend (apps/customer, apps/pharmacy, apps/admin)
- React 18 + Vite 5 + TypeScript (strict mode)
- Tailwind CSS (config shared from packages/config/tailwind.config.js)
- Framer Motion for page transitions and micro-interactions
- React Router v6 (all routes lazy-loaded via React.lazy + Suspense)
- Zustand for client-side state (cart, auth, location)
- TanStack Query v5 (React Query) for server state, caching, background refetch
- React Hook Form + Zod for form validation
- Axios with interceptor for automatic JWT refresh on 401
- Lucide React for all icons (never use emoji as icons)
- Recharts for analytics charts (pharmacy + admin dashboards)
- React Leaflet + OpenStreetMap for maps (no Google Maps — cost)
- Socket.io-client for WebSocket real-time updates
- vite-plugin-pwa (Workbox) for service worker and PWA manifest

## Backend (packages/api)
- Node.js 20 LTS + Fastify 4 + TypeScript (strict mode)
- Prisma ORM with PostgreSQL 16
- ioredis for Redis connection
- BullMQ for background job queues (notifications, analytics)
- Socket.io server attached to Fastify HTTP server
- Cloudinary SDK v2 for file management (signed URL generation only)
- firebase-admin for FCM push notifications
- razorpay npm package for payment integration
- Zod for all request/response validation
- Pino for structured JSON logging

## Shared Packages
- packages/types: Zod schemas + inferred TypeScript types (shared frontend/backend)
- packages/ui: React component library (no framework dependency)
- packages/config: tailwind.config.js, eslint.config.js, tsconfig.base.json

## External Services
- PostgreSQL: Supabase or Railway managed
- Redis: Upstash (serverless, free tier generous)
- Search: MeiliSearch Cloud (free tier) or self-hosted
- Files: Cloudinary (free tier: 25GB)
- CDN: Cloudflare (free, critical for India latency)
- SMS/OTP: MSG91 (India-specific, cheap)
- Payments: Razorpay (UPI-first, India standard)
- Push: Firebase Cloud Messaging (free)
- Hosting API: Railway.app
- Hosting PWAs: Vercel

## Code Standards
- ALWAYS TypeScript. Zero .js files in src/
- ALWAYS async/await. Never .then() promise chains
- ALWAYS Zod validation on every API endpoint input
- ALWAYS use the shared response format (packages/api/src/utils/response.ts)
- ALWAYS use Prisma transactions for multi-table writes
- NEVER store JWT in localStorage — use httpOnly cookies for refresh token
- NEVER expose API keys to frontend — use signed URLs for Cloudinary
- NEVER hard-delete records — soft delete with isActive = false
- ALWAYS handle errors with try/catch and the global error handler
