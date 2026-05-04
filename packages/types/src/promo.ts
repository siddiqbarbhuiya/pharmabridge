import { z } from 'zod'

/* ── Enum ────────────────────────────────────────────────────────────── */

export const PromoCardType = z.enum(['BANNER', 'OFFER', 'HIGHLIGHT'])
export type PromoCardType = z.infer<typeof PromoCardType>

/* ── Full promo card record (API read) ────────────────────────────────── */

export const PromoCardSchema = z.object({
  id:           z.string().cuid(),
  title:        z.string(),
  subtitle:     z.string().nullable(),
  imageUrl:     z.string().url(),
  ctaLabel:     z.string().nullable(),
  ctaUrl:       z.string().nullable(),         // may be a relative path like /search?q=x
  type:         PromoCardType,
  displayOrder: z.number().int().nonnegative(),
  isActive:     z.boolean(),
  startsAt:     z.string().datetime().nullable(),
  endsAt:       z.string().datetime().nullable(),
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
})
export type PromoCard = z.infer<typeof PromoCardSchema>

/* ── Write schemas ────────────────────────────────────────────────────── */

export const CreatePromoCardSchema = z.object({
  title:        z.string().min(1).max(100),
  subtitle:     z.string().max(200).optional(),
  imageUrl:     z.string().url(),
  ctaLabel:     z.string().max(50).optional(),
  ctaUrl:       z.string().max(500).optional(),
  type:         PromoCardType.default('BANNER'),
  displayOrder: z.number().int().nonnegative().default(0),
  startsAt:     z.string().datetime().optional(),
  endsAt:       z.string().datetime().optional(),
}).refine(
  (d) => {
    if (d.startsAt && d.endsAt) return d.startsAt < d.endsAt
    return true
  },
  { message: 'startsAt must be before endsAt', path: ['endsAt'] },
)
export type CreatePromoCard = z.infer<typeof CreatePromoCardSchema>

export const UpdatePromoCardSchema = z.object({
  title:        z.string().min(1).max(100),
  subtitle:     z.string().max(200),
  imageUrl:     z.string().url(),
  ctaLabel:     z.string().max(50),
  ctaUrl:       z.string().max(500),
  type:         PromoCardType,
  displayOrder: z.number().int().nonnegative(),
  isActive:     z.boolean(),
  startsAt:     z.string().datetime(),
  endsAt:       z.string().datetime(),
}).partial()
export type UpdatePromoCard = z.infer<typeof UpdatePromoCardSchema>

/* ── Reorder (drag-and-drop sort) ─────────────────────────────────────── */

export const ReorderPromoCardsSchema = z.object({
  /** Ordered array of IDs — defines new displayOrder values 0, 1, 2 … */
  ids: z.array(z.string().cuid()).min(1),
})
export type ReorderPromoCards = z.infer<typeof ReorderPromoCardsSchema>
