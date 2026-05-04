import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  SignedUrlRequestSchema,
  UploadPrescriptionSchema,
  ReviewPrescriptionSchema,
} from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { requireRole } from '../middleware/requireRole'
import { generateSignedUploadParams } from '../utils/cloudinary'

const prescriptionRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /prescriptions/upload — generate Cloudinary signed upload URL ─
  fastify.post('/prescriptions/upload', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = SignedUrlRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const uploadParams = generateSignedUploadParams(parsed.data.folder, request.user.userId)
    return reply.send(success(uploadParams))
  })

  // ── POST /prescriptions — save prescription record after Cloudinary upload
  fastify.post('/prescriptions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = UploadPrescriptionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const prescription = await fastify.prisma.prescription.create({
      data: {
        customerId: request.user.userId,
        imageUrl:   parsed.data.imageUrl,
        orderId:    parsed.data.orderId,
        status:     'PENDING',
      },
    })

    return reply.code(201).send(success(prescription, 'Prescription uploaded successfully'))
  })

  // ── GET /prescriptions — user's own prescriptions ─────────────────────
  fastify.get('/prescriptions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const QuerySchema = z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      page:   z.coerce.number().int().positive().default(1),
      limit:  z.coerce.number().int().positive().max(50).default(20),
    })

    const parsed = QuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const { status, page, limit } = parsed.data
    const where = {
      customerId: request.user.userId,
      isActive:   true,
      ...(status ? { status } : {}),
    }

    const [data, total] = await Promise.all([
      fastify.prisma.prescription.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.prescription.count({ where }),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // ── PATCH /prescriptions/:id/verify — PHARMACY_OWNER ──────────────────
  fastify.patch('/prescriptions/:id/verify', {
    preHandler: [fastify.authenticate, requireRole('PHARMACY_OWNER')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = ReviewPrescriptionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const prescription = await fastify.prisma.prescription.findUnique({
      where:   { id },
      include: { order: { select: { pharmacyId: true } } },
    })

    if (!prescription || !prescription.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Prescription not found'))
    }

    // If linked to an order, ensure it belongs to the pharmacy owner's pharmacy
    if (prescription.order && prescription.order.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not have access to this prescription'))
    }

    const updated = await fastify.prisma.prescription.update({
      where: { id },
      data:  { status: parsed.data.status, note: parsed.data.note },
    })

    // Notify customer via WebSocket
    fastify.io.of('/customer').to(`user:${prescription.customerId}`).emit('prescription:status_updated', {
      prescriptionId: id,
      status:         parsed.data.status,
      note:           parsed.data.note,
    })

    return reply.send(success(
      updated,
      parsed.data.status === 'APPROVED' ? 'Prescription approved' : 'Prescription rejected',
    ))
  })
}

export default prescriptionRoutes
