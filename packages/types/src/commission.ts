import { z } from 'zod'

/* ── Enum ────────────────────────────────────────────────────────────── */

export const CommissionStatus = z.enum(['PENDING', 'PAID', 'CANCELLED'])
export type CommissionStatus = z.infer<typeof CommissionStatus>

/* ── Full commission record (API read) ───────────────────────────────── */

export const CommissionSchema = z.object({
  id:         z.string().cuid(),
  rate:       z.number().min(0).max(1),      // 0.02 = 2%
  amount:     z.number().nonnegative(),       // computed rupees
  status:     CommissionStatus,
  paidAt:     z.string().datetime().nullable(),
  orderId:    z.string().cuid(),
  pharmacyId: z.string().cuid(),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
})
export type Commission = z.infer<typeof CommissionSchema>

/* ── Admin: mark commission paid ─────────────────────────────────────── */

export const MarkCommissionPaidSchema = z.object({
  ids:    z.array(z.string().cuid()).min(1),
  paidAt: z.string().datetime().optional(),
})
export type MarkCommissionPaid = z.infer<typeof MarkCommissionPaidSchema>

/* ── Query ───────────────────────────────────────────────────────────── */

export const CommissionQuerySchema = z.object({
  pharmacyId: z.string().cuid().optional(),
  status:     CommissionStatus.optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
  sortBy:     z.enum(['createdAt', 'amount']).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
})
export type CommissionQuery = z.infer<typeof CommissionQuerySchema>
