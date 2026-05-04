import { z } from 'zod'

export const PaginationSchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
  sortBy:    z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
export type Pagination = z.infer<typeof PaginationSchema>

/** Signed upload URL request (step 1 of the Cloudinary upload flow) */
export const SignedUrlRequestSchema = z.object({
  folder:   z.enum(['prescriptions', 'medicines', 'pharmacy-logos', 'licenses', 'doctor-profiles']),
  fileType: z.string().regex(/^image\/(jpeg|png|webp)$/, 'Only jpeg, png, webp allowed'),
})
export type SignedUrlRequest = z.infer<typeof SignedUrlRequestSchema>

export const SignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicId:  z.string(),
  signature: z.string(),
})
export type SignedUrlResponse = z.infer<typeof SignedUrlResponseSchema>

export const PhoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (must be 10 digits starting with 6-9)')

export const PincodeSchema = z.string().regex(/^\d{6}$/, 'Invalid pincode (must be 6 digits)')

export const AddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  district: z.string().optional(),
  state: z.string().min(1, 'State is required'),
  pincode: PincodeSchema,
  landmark: z.string().optional(),
})

export type Address = z.infer<typeof AddressSchema>

export const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const

export type IndiaState = (typeof INDIA_STATES)[number]

export const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
