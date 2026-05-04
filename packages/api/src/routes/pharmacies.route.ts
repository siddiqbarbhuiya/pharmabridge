import type { FastifyPluginAsync } from 'fastify'
import {
  CreatePharmacySchema,
  ApprovePharmacySchema,
  NearbyPharmacyQuerySchema,
} from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { requireRole } from '../middleware/requireRole'
import { isPrismaUniqueConflict } from '../utils/errors'

// Haversine formula — returns distance in km between two lat/lng points
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const pharmacyRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /pharmacies/nearby?lat=&lng=&radius= ─────────────────────────
  fastify.get('/pharmacies/nearby', async (request, reply) => {
    const parsed = NearbyPharmacyQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const { lat, lng, radius, page, limit } = parsed.data

    const all = await fastify.prisma.pharmacy.findMany({
      where: { isApproved: true, isActive: true, lat: { not: null }, lng: { not: null } },
    })

    const nearby = all
      .map((p) => ({ ...p, distanceKm: haversine(lat, lng, p.lat!, p.lng!) }))
      .filter((p) => p.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    const total      = nearby.length
    const totalPages = Math.ceil(total / limit) || 1
    const data       = nearby.slice((page - 1) * limit, page * limit)

    return reply.send(success(data, undefined, { page, limit, total, totalPages }))
  })

  // ── GET /pharmacies/:id ──────────────────────────────────────────────
  fastify.get('/pharmacies/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const pharmacy = await fastify.prisma.pharmacy.findUnique({
      where: { id },
      include: {
        doctors: {
          where: { isActive: true },
          select: {
            id:              true,
            name:            true,
            specialty:       true,
            consultationFee: true,
            imageUrl:        true,
            isVerified:      true,
            experience:      true,
            qualifications:  true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!pharmacy || !pharmacy.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Pharmacy not found'))
    }

    return reply.send(success(pharmacy))
  })

  // ── POST /pharmacies — authenticated; creates PENDING pharmacy ────────
  fastify.post('/pharmacies', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = CreatePharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const userId = request.user.userId

    const existing = await fastify.prisma.pharmacy.findUnique({ where: { ownerId: userId } })
    if (existing) {
      return reply.code(409).send(error(ERROR_CODES.DUPLICATE_ENTRY, 'You already have a registered pharmacy'))
    }

    try {
      const pharmacy = await fastify.prisma.$transaction(async (tx) => {
        const p = await tx.pharmacy.create({
          data: {
            name:          parsed.data.name,
            licenseNumber: parsed.data.licenseNumber,
            phone:         parsed.data.phone,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            address:       parsed.data.address as any,
            lat:           parsed.data.lat,
            lng:           parsed.data.lng,
            deliveryRadius: parsed.data.deliveryRadius ?? 5,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            openingHours:  parsed.data.openingHours as any,
            logoUrl:       parsed.data.logoUrl,
            ownerId:       userId,
            isApproved:    false,
          },
        })
        await tx.user.update({ where: { id: userId }, data: { role: 'PHARMACY_OWNER' } })
        return p
      })

      return reply.code(201).send(success(pharmacy, 'Pharmacy registered. Pending admin approval.'))
    } catch (err) {
      if (isPrismaUniqueConflict(err)) {
        return reply.code(409).send(error(ERROR_CODES.DUPLICATE_ENTRY, 'License number already registered'))
      }
      throw err
    }
  })

  // ── PATCH /pharmacies/:id/status — admin only ────────────────────────
  fastify.patch('/pharmacies/:id/status', {
    preHandler: [fastify.authenticate, requireRole('ADMIN', 'SUPER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = ApprovePharmacySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const pharmacy = await fastify.prisma.pharmacy.findUnique({ where: { id } })
    if (!pharmacy) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Pharmacy not found'))
    }

    const updated = await fastify.prisma.pharmacy.update({
      where: { id },
      data:  { isApproved: parsed.data.isApproved },
    })

    fastify.io.of('/pharmacy').to(`pharmacy:${id}`).emit('pharmacy:status_updated', {
      pharmacyId: id,
      isApproved: parsed.data.isApproved,
      note:       parsed.data.note,
    })

    return reply.send(success(
      updated,
      parsed.data.isApproved ? 'Pharmacy approved' : 'Pharmacy approval revoked',
    ))
  })
}

export default pharmacyRoutes
