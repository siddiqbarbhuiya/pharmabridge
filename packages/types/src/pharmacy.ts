import { z } from 'zod'
import { AddressSchema } from './common'

/* ── Opening hours ───────────────────────────────────────────────────── */

const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')

const DayScheduleSchema = z.object({
  open:   TimeString,
  close:  TimeString,
  isOpen: z.boolean().default(true),
})
export type DaySchedule = z.infer<typeof DayScheduleSchema>

export const OpeningHoursSchema = z.object({
  monday:    DayScheduleSchema,
  tuesday:   DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday:  DayScheduleSchema,
  friday:    DayScheduleSchema,
  saturday:  DayScheduleSchema,
  sunday:    DayScheduleSchema,
}).partial()
export type OpeningHours = z.infer<typeof OpeningHoursSchema>

/* ── Create / update ─────────────────────────────────────────────────── */

export const CreatePharmacySchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters').max(200),
  licenseNumber:  z.string().min(1).max(100),
  phone:          z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  address:        AddressSchema,
  lat:            z.number().min(-90).max(90).optional(),
  lng:            z.number().min(-180).max(180).optional(),
  deliveryRadius: z.number().positive().max(50).default(5),
  openingHours:   OpeningHoursSchema.optional(),
  logoUrl:        z.string().url().optional(),
})
export type CreatePharmacy = z.infer<typeof CreatePharmacySchema>

export const UpdatePharmacySchema = CreatePharmacySchema.partial()
export type UpdatePharmacy = z.infer<typeof UpdatePharmacySchema>

/* ── Full pharmacy record (API read) ─────────────────────────────────── */

export const PharmacySchema = z.object({
  id:             z.string().cuid(),
  name:           z.string(),
  licenseNumber:  z.string(),
  logoUrl:        z.string().url().nullable(),
  phone:          z.string(),
  address:        AddressSchema,
  lat:            z.number().nullable(),
  lng:            z.number().nullable(),
  deliveryRadius: z.number(),
  isApproved:     z.boolean(),
  isActive:       z.boolean(),
  openingHours:   OpeningHoursSchema.nullable(),
  ownerId:        z.string().cuid(),
  createdAt:      z.string().datetime(),
  updatedAt:      z.string().datetime(),
})
export type Pharmacy = z.infer<typeof PharmacySchema>

/** Lightweight summary used in lists / medicine cards / order history */
export const PharmacySummarySchema = PharmacySchema.pick({
  id:             true,
  name:           true,
  logoUrl:        true,
  phone:          true,
  deliveryRadius: true,
  isApproved:     true,
  lat:            true,
  lng:            true,
})
export type PharmacySummary = z.infer<typeof PharmacySummarySchema>

/* ── Query schemas ───────────────────────────────────────────────────── */

export const NearbyPharmacyQuerySchema = z.object({
  lat:    z.coerce.number().min(-90).max(90),
  lng:    z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(50).default(10),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(50).default(20),
})
export type NearbyPharmacyQuery = z.infer<typeof NearbyPharmacyQuerySchema>

export const PharmacyQuerySchema = z.object({
  search:     z.string().optional(),
  isApproved: z.coerce.boolean().optional(),
  isActive:   z.coerce.boolean().optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
})
export type PharmacyQuery = z.infer<typeof PharmacyQuerySchema>

/* ── Admin: approve/reject ───────────────────────────────────────────── */

export const ApprovePharmacySchema = z.object({
  isApproved: z.boolean(),
  note:       z.string().max(500).optional(),
})
export type ApprovePharmacy = z.infer<typeof ApprovePharmacySchema>
