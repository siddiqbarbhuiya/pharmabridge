import type { ErrorCode } from './response'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, 'VALIDATION_ERROR', message)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Duplicate entry') {
    super(409, 'DUPLICATE_ENTRY', message)
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment failed') {
    super(402, 'PAYMENT_FAILED', message)
  }
}

export class SlotUnavailableError extends AppError {
  constructor() {
    super(409, 'SLOT_UNAVAILABLE', 'This appointment slot is no longer available')
  }
}

/** Checks if a Prisma error is a record-not-found error (P2025) */
export function isPrismaNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === 'P2025'
  )
}

/** Checks if a Prisma error is a unique constraint violation (P2002) */
export function isPrismaUniqueConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === 'P2002'
  )
}
