import { z } from 'zod'

/* ── Error Codes ─────────────────────────────────────────────────────
   Must match exactly the strings used in packages/api error responses.
   Frontend maps these to user-facing messages.
   ──────────────────────────────────────────────────────────────────── */

export const ErrorCodeSchema = z.enum([
  'INVALID_OTP',
  'OTP_EXPIRED',
  'OTP_LIMIT_EXCEEDED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'STOCK_UNAVAILABLE',
  'PRESCRIPTION_REQUIRED',
  'PHARMACY_CLOSED',
  'PHARMACY_NOT_APPROVED',
  'ORDER_CANNOT_BE_CANCELLED',
  'PAYMENT_FAILED',
  'PAYMENT_VERIFICATION_FAILED',
  'DUPLICATE_ENTRY',
  'SLOT_UNAVAILABLE',
  'DOCTOR_NOT_VERIFIED',
  'SERVER_ERROR',
])
export type ErrorCode = z.infer<typeof ErrorCodeSchema>

export const ERROR_CODES = ErrorCodeSchema.enum

/* ── Pagination ──────────────────────────────────────────────────────── */

export const PaginatedMetaSchema = z.object({
  page:       z.number().int().positive(),
  limit:      z.number().int().positive(),
  total:      z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})
export type PaginatedMeta = z.infer<typeof PaginatedMetaSchema>

/* ── Error envelope ─────────────────────────────────────────────────── */

export const ApiErrorBodySchema = z.object({
  success: z.literal(false),
  error: z.object({
    code:    ErrorCodeSchema,
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>

/* ── Success envelope factories (for response validation) ────────────── */

/** Wrap any data schema in a success envelope */
export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data:    dataSchema,
    meta:    PaginatedMetaSchema.optional(),
    message: z.string().optional(),
  })

/** Wrap an item schema in a paginated list success envelope */
export const paginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data:    z.array(itemSchema),
    meta:    PaginatedMetaSchema,
    message: z.string().optional(),
  })

/* ── TypeScript utility types ────────────────────────────────────────── */

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: PaginatedMeta
  message?: string
}

export type ApiError = {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: unknown[]
  }
}

/** Discriminated union — every API call resolves to one of these */
export type ApiResponse<T> = ApiSuccess<T> | ApiError

/** Typed paginated list — meta is required */
export type PaginatedResponse<T> = {
  success: true
  data: T[]
  meta: PaginatedMeta
  message?: string
}
