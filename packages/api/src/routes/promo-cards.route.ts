import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { success, error, ERROR_CODES } from '../utils/response'
import { requireRole } from '../middleware/requireRole'

const PromoTarget   = z.enum(['CUSTOMER', 'PHARMACY', 'ALL'])
const PromoCardType = z.enum(['BANNER', 'OFFER', 'HIGHLIGHT'])
type PromoTarget    = z.infer<typeof PromoTarget>

const CACHE_TTL = 600 // 10 minutes in seconds

function cacheKey(target: PromoTarget) {
  return `promo-cards:${target}`
}

async function invalidateAll(redis: { del(...keys: string[]): Promise<unknown> }) {
  await redis.del('promo-cards:CUSTOMER', 'promo-cards:PHARMACY', 'promo-cards:ALL')
}

const CreatePromoCardSchema = z.object({
  type:       PromoCardType.default('BANNER'),
  badge:      z.string().max(50).optional(),
  title:      z.string().min(1).max(100),
  subtitle:   z.string().max(200).optional(),
  imageUrl:   z.string().url().optional(),
  background: z.string().default('#3B82F6'), // frontend gradient key or hex — accepted but not persisted (no DB column)
  stockTags:  z.array(z.string()).max(10).optional(),
  ctaLabel:   z.string().max(50).optional(),
  ctaUrl:     z.string().max(500).optional(),
  targetApp:  PromoTarget,
  startAt:    z.string().datetime().optional(),
  endAt:      z.string().datetime().optional(),
  order:      z.number().int().nonnegative().optional(),
})

const UpdatePromoCardSchema = CreatePromoCardSchema.partial()

const promoCardRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /promo-cards — public, Redis-cached ───────────────────────────
  fastify.get('/promo-cards', async (request, reply) => {
    const parsed = z.object({
      target: PromoTarget.default('CUSTOMER'),
    }).safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', parsed.error.issues))
    }

    const { target } = parsed.data
    const key = cacheKey(target)

    const cached = await fastify.redis.get(key)
    if (cached) {
      return reply.send(success(JSON.parse(cached)))
    }

    const now = new Date()

    // target=CUSTOMER → cards targeted at CUSTOMER + ALL
    // target=PHARMACY → cards targeted at PHARMACY + ALL
    // target=ALL      → cards targeted at ALL only
    const targetFilter = target === 'ALL'
      ? { target: 'ALL'  as const }
      : { target: { in: [target, 'ALL'] as ['CUSTOMER' | 'PHARMACY' | 'ALL', 'CUSTOMER' | 'PHARMACY' | 'ALL'] } }

    const cards = await fastify.prisma.promoCard.findMany({
      where: {
        isActive: true,
        ...targetFilter,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt:   null }, { endsAt:   { gte: now } }] },
        ],
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    })

    await fastify.redis.set(key, JSON.stringify(cards), 'EX', CACHE_TTL)

    return reply.send(success(cards))
  })

  // ── Admin routes (ADMIN | SUPER_ADMIN) ───────────────────────────────
  const preHandler = [fastify.authenticate, requireRole('ADMIN', 'SUPER_ADMIN')]

  // GET /admin/promo-cards — all including inactive, paginated
  fastify.get('/admin/promo-cards', { preHandler }, async (request, reply) => {
    const parsed = z.object({
      page:      z.coerce.number().int().positive().default(1),
      limit:     z.coerce.number().int().positive().max(100).default(20),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }).safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', parsed.error.issues))
    }

    const { page, limit, sortOrder } = parsed.data

    const [data, total] = await Promise.all([
      fastify.prisma.promoCard.findMany({
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ displayOrder: sortOrder }, { createdAt: 'desc' }],
      }),
      fastify.prisma.promoCard.count(),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // POST /admin/promo-cards — create
  fastify.post('/admin/promo-cards', { preHandler }, async (request, reply) => {
    const parsed = CreatePromoCardSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid request body', parsed.error.issues))
    }

    const d = parsed.data

    const card = await fastify.prisma.promoCard.create({
      data: {
        type:         d.type,
        badge:        d.badge,
        title:        d.title,
        subtitle:     d.subtitle,
        imageUrl:     d.imageUrl,
        tags:         d.stockTags ?? [],
        ctaLabel:     d.ctaLabel,
        ctaUrl:       d.ctaUrl,
        target:       d.targetApp,
        startsAt:     d.startAt ? new Date(d.startAt) : undefined,
        endsAt:       d.endAt   ? new Date(d.endAt)   : undefined,
        displayOrder: d.order   ?? 0,
      },
    })

    await invalidateAll(fastify.redis)

    return reply.code(201).send(success(card, 'Promo card created'))
  })

  // PATCH /admin/promo-cards/:id — partial update
  // NOTE: register before /reorder so Fastify doesn't confuse :id with "reorder"
  fastify.patch('/admin/promo-cards/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = UpdatePromoCardSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid request body', parsed.error.issues))
    }

    const existing = await fastify.prisma.promoCard.findUnique({ where: { id } })
    if (!existing) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Promo card not found'))
    }

    const d = parsed.data

    const card = await fastify.prisma.promoCard.update({
      where: { id },
      data:  {
        ...(d.type      !== undefined && { type:         d.type }),
        ...(d.badge     !== undefined && { badge:        d.badge }),
        ...(d.title     !== undefined && { title:        d.title }),
        ...(d.subtitle  !== undefined && { subtitle:     d.subtitle }),
        ...(d.imageUrl  !== undefined && { imageUrl:     d.imageUrl }),
        ...(d.stockTags !== undefined && { tags:         d.stockTags }),
        ...(d.ctaLabel  !== undefined && { ctaLabel:     d.ctaLabel }),
        ...(d.ctaUrl    !== undefined && { ctaUrl:       d.ctaUrl }),
        ...(d.targetApp !== undefined && { target:       d.targetApp }),
        ...(d.startAt   !== undefined && { startsAt:     new Date(d.startAt) }),
        ...(d.endAt     !== undefined && { endsAt:       new Date(d.endAt) }),
        ...(d.order     !== undefined && { displayOrder: d.order }),
      },
    })

    await invalidateAll(fastify.redis)

    return reply.send(success(card, 'Promo card updated'))
  })

  // DELETE /admin/promo-cards/:id — soft delete
  fastify.delete('/admin/promo-cards/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await fastify.prisma.promoCard.findUnique({ where: { id } })
    if (!existing) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Promo card not found'))
    }

    await fastify.prisma.promoCard.update({ where: { id }, data: { isActive: false } })

    await invalidateAll(fastify.redis)

    return reply.send(success(null, 'Promo card deleted'))
  })

  // POST /admin/promo-cards/reorder
  fastify.post('/admin/promo-cards/reorder', { preHandler }, async (request, reply) => {
    const parsed = z.object({
      cards: z.array(z.object({
        id:    z.string().cuid(),
        order: z.number().int().nonnegative(),
      })).min(1),
    }).safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid request body', parsed.error.issues))
    }

    await fastify.prisma.$transaction(
      parsed.data.cards.map(({ id, order }) =>
        fastify.prisma.promoCard.update({ where: { id }, data: { displayOrder: order } })
      )
    )

    await invalidateAll(fastify.redis)

    return reply.send(success(null, 'Promo cards reordered'))
  })
}

export default promoCardRoutes
