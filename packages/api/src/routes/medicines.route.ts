import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  CreateMedicineSchema,
  UpdateMedicineSchema,
  UpdateMedicineStockSchema,
  MedicineSearchQuerySchema,
} from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { requireRole } from '../middleware/requireRole'
import { isPrismaUniqueConflict } from '../utils/errors'

const pharmacySelect = {
  id:             true,
  name:           true,
  logoUrl:        true,
  deliveryRadius: true,
  isApproved:     true,
  lat:            true,
  lng:            true,
} as const

const medicineRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /medicines/search?q=&pharmacyId=&category= ───────────────────
  fastify.get('/medicines/search', async (request, reply) => {
    const QuerySchema = MedicineSearchQuerySchema.extend({
      category: z.string().optional(),
    })
    const parsed = QuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const {
      q, pharmacyId, category, isPrescriptionRequired,
      inStock, minPrice, maxPrice, page, limit, sortBy, sortOrder,
    } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      isActive: true,
      pharmacy: { isApproved: true, isActive: true },
    }

    if (q) {
      where.OR = [
        { name:         { contains: q, mode: 'insensitive' } },
        { genericName:  { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (pharmacyId)                  where.pharmacyId = pharmacyId
    // category maps to genericName (drug classification proxy — no dedicated category field)
    if (category)                    where.genericName = { contains: category, mode: 'insensitive' }
    if (isPrescriptionRequired !== undefined) where.isPrescriptionRequired = isPrescriptionRequired
    if (inStock)                     where.stock = { gt: 0 }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined) where.price.gte = minPrice
      if (maxPrice !== undefined) where.price.lte = maxPrice
    }

    const [data, total] = await Promise.all([
      fastify.prisma.medicine.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { [sortBy]: sortOrder },
        include: { pharmacy: { select: pharmacySelect } },
      }),
      fastify.prisma.medicine.count({ where }),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // ── GET /medicines/:id ───────────────────────────────────────────────
  fastify.get('/medicines/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const medicine = await fastify.prisma.medicine.findUnique({
      where:   { id },
      include: { pharmacy: { select: pharmacySelect } },
    })

    if (!medicine || !medicine.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Medicine not found'))
    }

    return reply.send(success(medicine))
  })

  // ── POST /medicines — PHARMACY_OWNER ─────────────────────────────────
  fastify.post('/medicines', {
    preHandler: [fastify.authenticate, requireRole('PHARMACY_OWNER')],
  }, async (request, reply) => {
    const parsed = CreateMedicineSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const pharmacy = await fastify.prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    if (!pharmacy || !pharmacy.isApproved) {
      return reply.code(403).send(error(
        ERROR_CODES.PHARMACY_NOT_APPROVED,
        'Your pharmacy must be approved before adding medicines',
      ))
    }

    try {
      const medicine = await fastify.prisma.medicine.create({
        data: { ...parsed.data, pharmacyId },
      })
      return reply.code(201).send(success(medicine, 'Medicine added successfully'))
    } catch (err) {
      if (isPrismaUniqueConflict(err)) {
        return reply.code(409).send(error(ERROR_CODES.DUPLICATE_ENTRY, 'Medicine already exists'))
      }
      throw err
    }
  })

  // ── PATCH /medicines/:id — PHARMACY_OWNER, must own the medicine ──────
  fastify.patch('/medicines/:id', {
    preHandler: [fastify.authenticate, requireRole('PHARMACY_OWNER')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = UpdateMedicineSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const medicine = await fastify.prisma.medicine.findUnique({ where: { id } })
    if (!medicine || !medicine.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Medicine not found'))
    }

    if (!request.user.pharmacyId || medicine.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this medicine'))
    }

    // Validate price <= mrp using the effective (post-update) values
    const effectivePrice = parsed.data.price ?? medicine.price
    const effectiveMrp   = parsed.data.mrp   ?? medicine.mrp
    if (effectivePrice > effectiveMrp) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Selling price cannot exceed MRP'))
    }

    const updated = await fastify.prisma.medicine.update({
      where: { id },
      data:  parsed.data,
    })

    return reply.send(success(updated, 'Medicine updated successfully'))
  })

  // ── PATCH /medicines/:id/stock — PHARMACY_OWNER ──────────────────────
  fastify.patch('/medicines/:id/stock', {
    preHandler: [fastify.authenticate, requireRole('PHARMACY_OWNER')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = UpdateMedicineStockSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const medicine = await fastify.prisma.medicine.findUnique({ where: { id } })
    if (!medicine || !medicine.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Medicine not found'))
    }

    if (!request.user.pharmacyId || medicine.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this medicine'))
    }

    const newStock      = parsed.data.stock
    const previousStock = medicine.stock
    const delta         = newStock - previousStock

    const updated = await fastify.prisma.$transaction(async (tx) => {
      const m = await tx.medicine.update({ where: { id }, data: { stock: newStock } })
      await tx.inventoryLog.create({
        data: { medicineId: id, action: 'ADJUSTMENT', delta, previousStock, newStock },
      })
      return m
    })

    return reply.send(success(updated, 'Stock updated successfully'))
  })
}

export default medicineRoutes
