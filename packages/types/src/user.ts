import { z } from 'zod'
import { PhoneSchema } from './common'
import { UserRole } from './auth'

/* ── Full user record (API read) ─────────────────────────────────────── */

export const UserSchema = z.object({
  id:             z.string().cuid(),
  phone:          PhoneSchema,
  name:           z.string().min(1).max(100).nullable(),
  email:          z.string().email().nullable(),
  role:           UserRole,
  consentGivenAt: z.string().datetime().nullable(),
  fcmToken:       z.string().nullable(),
  isActive:       z.boolean(),
  createdAt:      z.string().datetime(),
  updatedAt:      z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>

/* ── Update profile (PATCH /api/v1/users/me) ─────────────────────────── */

export const UpdateUserSchema = z.object({
  name:           z.string().min(1).max(100),
  email:          z.string().email(),
  fcmToken:       z.string(),
  consentGivenAt: z.string().datetime(),
}).partial()
export type UpdateUser = z.infer<typeof UpdateUserSchema>

/* ── Admin: list users query ─────────────────────────────────────────── */

export const UserQuerySchema = z.object({
  role:     UserRole.optional(),
  isActive: z.coerce.boolean().optional(),
  search:   z.string().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
})
export type UserQuery = z.infer<typeof UserQuerySchema>
