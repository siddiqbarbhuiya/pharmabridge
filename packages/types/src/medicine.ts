import { z } from 'zod'

/* ── Full medicine record (API read) ─────────────────────────────────── */

export const MedicineSchema = z.object({
  id:                     z.string().cuid(),
  name:                   z.string().min(1),
  genericName:            z.string().nullable(),
  manufacturer:           z.string().min(1),
  mrp:                    z.number().positive(),
  price:                  z.number().positive(),
  discountPercent:        z.number().min(0).max(100).default(0),
  gstRate:                z.number().min(0).max(28),
  hsnCode:                z.string().min(1),
  isPrescriptionRequired: z.boolean().default(false),
  unit:                   z.string().default('strip'),
  imageUrl:               z.string().url().nullable(),
  stock:                  z.number().int().min(0).default(0),
  isActive:               z.boolean().default(true),
  pharmacyId:             z.string().cuid(),
  createdAt:              z.string().datetime(),
  updatedAt:              z.string().datetime(),
})
export type Medicine = z.infer<typeof MedicineSchema>

/* ── Medicine with nested pharmacy summary (search results / cart) ───── */

export const MedicineWithPharmacySchema = MedicineSchema.extend({
  pharmacy: z.object({
    id:             z.string().cuid(),
    name:           z.string(),
    logoUrl:        z.string().url().nullable(),
    deliveryRadius: z.number(),
    isApproved:     z.boolean(),
    lat:            z.number().nullable(),
    lng:            z.number().nullable(),
  }),
})
export type MedicineWithPharmacy = z.infer<typeof MedicineWithPharmacySchema>

/* ── Write schemas ───────────────────────────────────────────────────── */

const MedicineWriteBase = MedicineSchema.omit({
  id:         true,
  pharmacyId: true,
  isActive:   true,
  createdAt:  true,
  updatedAt:  true,
  genericName: true,
  imageUrl:   true,
}).extend({
  genericName: z.string().optional(),
  imageUrl:    z.string().url().optional(),
})

export const CreateMedicineSchema = MedicineWriteBase.refine(
  (d) => d.price <= d.mrp,
  { message: 'Selling price cannot exceed MRP', path: ['price'] },
)
export type CreateMedicine = z.infer<typeof CreateMedicineSchema>

export const UpdateMedicineSchema = MedicineWriteBase.partial()
export type UpdateMedicine = z.infer<typeof UpdateMedicineSchema>

export const UpdateMedicineStockSchema = z.object({
  stock: z.number().int().min(0),
})
export type UpdateMedicineStock = z.infer<typeof UpdateMedicineStockSchema>

/* ── Search / list query ─────────────────────────────────────────────── */

export const MedicineSearchQuerySchema = z.object({
  q:                      z.string().optional(),
  pharmacyId:             z.string().cuid().optional(),
  isPrescriptionRequired: z.coerce.boolean().optional(),
  inStock:                z.coerce.boolean().optional(),
  minPrice:               z.coerce.number().positive().optional(),
  maxPrice:               z.coerce.number().positive().optional(),
  page:                   z.coerce.number().int().positive().default(1),
  limit:                  z.coerce.number().int().positive().max(50).default(20),
  sortBy:                 z.enum(['name', 'price', 'mrp', 'createdAt']).default('name'),
  sortOrder:              z.enum(['asc', 'desc']).default('asc'),
})
export type MedicineSearchQuery = z.infer<typeof MedicineSearchQuerySchema>
