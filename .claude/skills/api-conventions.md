# API Conventions

## Response Format (ALL endpoints, always)
```typescript
// Success
{
  success: true,
  data: T,
  meta?: { page: number, total: number, limit: number, totalPages: number },
  message?: string
}

// Error
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: ZodIssue[] | string[]
  }
}
```

## Standard Error Codes (use exact strings — frontend maps these)
```
INVALID_OTP              — OTP doesn't match
OTP_EXPIRED              — OTP TTL exceeded
OTP_LIMIT_EXCEEDED       — Too many OTP requests
UNAUTHORIZED             — No valid auth token
FORBIDDEN                — Authenticated but wrong role
NOT_FOUND                — Resource doesn't exist
VALIDATION_ERROR         — Request body/query failed Zod validation
STOCK_UNAVAILABLE        — Medicine quantity insufficient
PRESCRIPTION_REQUIRED    — Cart contains Rx-only medicines, no prescription
PHARMACY_CLOSED          — Order attempted when pharmacy is closed
PHARMACY_NOT_APPROVED    — Pharmacy pending admin approval
ORDER_CANNOT_BE_CANCELLED — Order past cancellation window
PAYMENT_FAILED           — Razorpay payment failure
PAYMENT_VERIFICATION_FAILED — HMAC signature mismatch
DUPLICATE_ENTRY          — Unique constraint violation
SERVER_ERROR             — Unexpected server error (always log these)
```

## Middleware Chain (packages/api/src/middleware/)

### authenticateUser.ts
```typescript
// Validates Bearer JWT in Authorization header
// Attaches { userId, role, pharmacyId? } to request
// Returns 401 UNAUTHORIZED if missing/invalid
```

### requireRole.ts
```typescript
// requireRole('PHARMACY_OWNER') — 403 if wrong role
// requireRole('ADMIN', 'SUPER_ADMIN') — accepts multiple roles
// Always use AFTER authenticateUser
```

### validatePharmacyOwner.ts
```typescript
// Checks that the authenticated user owns the pharmacyId in params
// Prevents pharmacy A from editing pharmacy B's data
```

## Authentication Flow
- Access token: JWT in `Authorization: Bearer <token>` header (15 min TTL)
- Refresh token: JWT in `pb_refresh_token` httpOnly cookie (30 day TTL)
- On 401 from any endpoint: frontend interceptor calls POST /auth/refresh
- If refresh fails: redirect to login, clear auth state
- Refresh token rotation: each refresh issues a new refresh token (old invalidated via Redis)

## Pagination Convention
All list endpoints support:
```
GET /endpoint?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```
Always return:
```json
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 847, "totalPages": 43 }
}
```

## File Upload Flow (NEVER accept files directly in request body)
```
1. Frontend: POST /files/signed-url { folder, fileType }
2. Backend: generate Cloudinary signed upload URL (2 min TTL)
3. Backend returns: { uploadUrl, publicId, signature }
4. Frontend: PUT directly to Cloudinary uploadUrl with file
5. Frontend: on success, sends back { secureUrl: cloudinary_secure_url } to backend
6. Backend: saves secureUrl to database
```
Folders: 'prescriptions', 'medicines', 'pharmacy-logos', 'licenses'

## Route Structure
```
/api/v1/auth/*           — public
/api/v1/public/*         — public (pharmacy list, medicine search)
/api/v1/users/*          — authenticated (any role)
/api/v1/customer/*       — authenticated, CUSTOMER role
/api/v1/pharmacy/*       — authenticated, PHARMACY_OWNER role
/api/v1/admin/*          — authenticated, ADMIN or SUPER_ADMIN role
/api/v1/payments/webhook — no auth (Razorpay server-to-server, verify by signature)
```

## Fastify Route Template
```typescript
// src/routes/example.route.ts
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { success, error } from '../utils/response'

const exampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/example/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      params: z.object({ id: z.string().cuid() }),
      querystring: z.object({ page: z.coerce.number().default(1) })
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const data = await fastify.prisma.someModel.findUniqueOrThrow({ where: { id } })
      return reply.send(success(data))
    } catch (err) {
      if (err.code === 'P2025') return reply.code(404).send(error('NOT_FOUND', 'Resource not found'))
      throw err // let global handler catch unknown errors
    }
  })
}

export default exampleRoutes
```

## Prisma Patterns
```typescript
// Always use transactions for multi-table writes
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData })
  await tx.orderItem.createMany({ data: items.map(i => ({ ...i, orderId: order.id })) })
  await tx.orderTimeline.create({ data: { orderId: order.id, status: 'PENDING' } })
  return order
})

// Pagination helper
const [data, total] = await Promise.all([
  prisma.medicine.findMany({ skip: (page - 1) * limit, take: limit, where, orderBy }),
  prisma.medicine.count({ where })
])

// Soft delete pattern
await prisma.medicine.update({ where: { id }, data: { isActive: false } })
// NOT: await prisma.medicine.delete(...)
```

## WebSocket Events (Socket.io)
```typescript
// Namespaces: /customer, /pharmacy, /admin
// Auth: validate JWT on connection, reject if invalid
// Rooms: 'user:{userId}', 'pharmacy:{pharmacyId}'

// Emitting from order service
fastify.io.of('/customer').to(`user:${customerId}`).emit('order:status_updated', {
  orderId, status, message, timestamp: new Date().toISOString()
})
```

## Environment Variables (always access via config.ts)
```typescript
// src/config.ts — validate all env vars at startup with Zod
// Never use process.env.XYZ directly in route handlers
// Always use: import { config } from '../config'
```
