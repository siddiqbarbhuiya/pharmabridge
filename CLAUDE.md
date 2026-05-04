# PharmaBridge — Claude Instructions

## Stack (summary)
- Monorepo: pnpm + Turborepo
- Frontend: React 18 + Vite + TypeScript + Tailwind + Framer Motion
- Backend: Fastify + Prisma + PostgreSQL + Redis
- Payments: Razorpay (UPI-first)
...

## Always
- TypeScript only, never .js
- Zod validation on all API inputs
- Standard response format: { success, data, meta, message }
...

## Detailed Skills (use when needed)
- /project:design-system — colors, typography, watermark footer
- /project:api-conventions — response formats, error codes
- /project:pwa-config — service worker, manifest, performance
- /project:indian-market — Razorpay, OTP, compliance
- /project:tech-stack — full dependency list

---

## Local Database
- Engine: PostgreSQL 16 (local)
- Host: localhost:5432
- Database: `pharmabridge`
- User: `postgres`
- DBeaver connection: postgres → Databases → pharmabridge

## Environment Setup (first time)
```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Copy env template and fill in secrets
cp packages/api/.env.example packages/api/.env
# Edit DATABASE_URL → postgresql://postgres:root@localhost:5432/pharmabridge

# 3. Generate Prisma Client (must do after schema changes)
pnpm --filter @pharmabridge/api db:generate

# 4. Apply schema to database
pnpm --filter @pharmabridge/api db:migrate
# OR for quick push without migration files (dev only):
pnpm --filter @pharmabridge/api db:push
```

## Daily Dev Commands
```bash
# Start API server (hot-reload via tsx watch)
pnpm --filter @pharmabridge/api dev

# Start all apps simultaneously (API + all frontends)
pnpm dev

# Typecheck everything
pnpm typecheck

# After editing prisma/schema.prisma — regenerate client
pnpm --filter @pharmabridge/api db:generate

# Create a new named migration (after schema changes)
pnpm --filter @pharmabridge/api exec prisma migrate dev --name <migration-name>

# Open Prisma Studio (visual DB browser)
pnpm --filter @pharmabridge/api db:studio

# Reset DB and re-apply all migrations (destructive!)
pnpm --filter @pharmabridge/api exec prisma migrate reset
```

## Prisma Version
Pinned to **v5.22.0** — do NOT upgrade to v7.x without a full migration audit.
The `prisma migrate dev` command will prompt about v7.8.0 — ignore it.