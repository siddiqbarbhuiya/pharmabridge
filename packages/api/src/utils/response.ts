import type { ZodIssue } from 'zod'
import type { PaginatedMeta } from '@pharmabridge/types'

export function success<T>(data: T, message?: string, meta?: PaginatedMeta) {
  return { success: true as const, data, ...(meta && { meta }), ...(message && { message }) }
}

export function error(code: string, message: string, details?: ZodIssue[] | string[]) {
  return { success: false as const, error: { code, message, ...(details && { details }) } }
}

export type ApiSuccess<T> = ReturnType<typeof success<T>>
export type ApiError = ReturnType<typeof error>

export const ERROR_CODES = {
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_LIMIT_EXCEEDED: 'OTP_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STOCK_UNAVAILABLE: 'STOCK_UNAVAILABLE',
  PRESCRIPTION_REQUIRED: 'PRESCRIPTION_REQUIRED',
  PHARMACY_CLOSED: 'PHARMACY_CLOSED',
  PHARMACY_NOT_APPROVED: 'PHARMACY_NOT_APPROVED',
  ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_VERIFICATION_FAILED: 'PAYMENT_VERIFICATION_FAILED',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  DOCTOR_NOT_VERIFIED: 'DOCTOR_NOT_VERIFIED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
