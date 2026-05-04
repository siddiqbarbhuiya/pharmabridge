import { z } from 'zod'
import { PincodeSchema } from './common'

/* ── Create / update input ───────────────────────────────────────────── */

export const CreateAddressSchema = z.object({
  line1:     z.string().min(1, 'Address line 1 is required').max(200),
  line2:     z.string().max(200).optional(),
  city:      z.string().min(1, 'City is required').max(100),
  district:  z.string().max(100).optional(),
  state:     z.string().min(1, 'State is required').max(100),
  pincode:   PincodeSchema,
  landmark:  z.string().max(200).optional(),
  isDefault: z.boolean().default(false),
})
export type CreateAddress = z.infer<typeof CreateAddressSchema>

export const UpdateAddressSchema = CreateAddressSchema.partial()
export type UpdateAddress = z.infer<typeof UpdateAddressSchema>

/* ── Full address record (API read) ──────────────────────────────────── */

export const AddressRecordSchema = z.object({
  id:        z.string().cuid(),
  line1:     z.string(),
  line2:     z.string().nullable(),
  city:      z.string(),
  district:  z.string().nullable(),
  state:     z.string(),
  pincode:   z.string(),
  landmark:  z.string().nullable(),
  isDefault: z.boolean(),
  userId:    z.string().cuid(),
})
export type AddressRecord = z.infer<typeof AddressRecordSchema>
