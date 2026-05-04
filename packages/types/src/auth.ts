import { z } from 'zod'
import { PhoneSchema } from './common'

export const UserRole = z.enum(['CUSTOMER', 'PHARMACY_OWNER', 'ADMIN', 'SUPER_ADMIN'])
export type UserRole = z.infer<typeof UserRole>

export const SendOtpSchema = z.object({
  phone: PhoneSchema,
})

export const VerifyOtpSchema = z.object({
  phone: PhoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export type SendOtp = z.infer<typeof SendOtpSchema>
export type VerifyOtp = z.infer<typeof VerifyOtpSchema>

export const AuthTokenPayload = z.object({
  userId: z.string().cuid(),
  role: UserRole,
  pharmacyId: z.string().cuid().optional(),
})

export type AuthTokenPayload = z.infer<typeof AuthTokenPayload>

export const UserProfileSchema = z.object({
  id: z.string().cuid(),
  phone: PhoneSchema,
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: UserRole,
  createdAt: z.string().datetime(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>
