import { z } from 'zod'

/* ── Enum ────────────────────────────────────────────────────────────── */

export const PrescriptionStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED'])
export type PrescriptionStatus = z.infer<typeof PrescriptionStatus>

/* ── Input schemas ───────────────────────────────────────────────────── */

export const UploadPrescriptionSchema = z.object({
  imageUrl: z.string().url('Must be a valid Cloudinary URL'),
  orderId:  z.string().cuid().optional(),
})
export type UploadPrescription = z.infer<typeof UploadPrescriptionSchema>

export const ReviewPrescriptionSchema = z.object({
  status: PrescriptionStatus,
  note:   z.string().max(500).optional(),
})
export type ReviewPrescription = z.infer<typeof ReviewPrescriptionSchema>

/* ── Full prescription record (API read) ─────────────────────────────── */

export const PrescriptionSchema = z.object({
  id:         z.string().cuid(),
  imageUrl:   z.string().url(),
  status:     PrescriptionStatus,
  note:       z.string().nullable(),
  isActive:   z.boolean(),
  customerId: z.string().cuid(),
  orderId:    z.string().cuid().nullable(),
  createdAt:  z.string().datetime(),
  updatedAt:  z.string().datetime(),
})
export type Prescription = z.infer<typeof PrescriptionSchema>

/* ── Query ───────────────────────────────────────────────────────────── */

export const PrescriptionQuerySchema = z.object({
  status:     PrescriptionStatus.optional(),
  customerId: z.string().cuid().optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(50).default(20),
})
export type PrescriptionQuery = z.infer<typeof PrescriptionQuerySchema>
