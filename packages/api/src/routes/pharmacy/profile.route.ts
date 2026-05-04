import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { success, error, ERROR_CODES } from '../../utils/response'
import { requireRole } from '../../middleware/requireRole'

const UpdatePharmacyProfileSchema = z.object({
  name:          z.string().min(2).max(200).optional(),
  phone:         z.string().optional(),
  isActive:      z.boolean().optional(),
  deliveryRadius: z.number().positive().max(50).optional(),
})

const pharmacyProfileRoutes: FastifyPluginAsync = async (fastify) => {
  const preHandler = [fastify.authenticate, requireRole('PHARMACY_OWNER')]

  // ── GET /pharmacy/profile ─────────────────────────────────────────────
  fastify.get('/profile', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const pharmacy = await fastify.prisma.pharmacy.findUnique({
      where:   { id: pharmacyId },
      include: { _count: { select: { doctors: true, medicines: true } } },
    })

    if (!pharmacy) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Pharmacy not found'))
    }

    return reply.send(success(pharmacy))
  })

  // ── PATCH /pharmacy/profile ───────────────────────────────────────────
  fastify.patch('/profile', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const parsed = UpdatePharmacyProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const updated = await fastify.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data:  parsed.data,
    })

    return reply.send(success(updated, 'Profile updated'))
  })

  // ── PATCH /pharmacy/profile/toggle ────────────────────────────────────
  fastify.patch('/profile/toggle', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const pharmacy = await fastify.prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    if (!pharmacy) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Pharmacy not found'))
    }

    const updated = await fastify.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data:  { isActive: !pharmacy.isActive },
    })

    return reply.send(success(updated, updated.isActive ? 'Pharmacy is now open' : 'Pharmacy is now closed'))
  })

  // ── GET /pharmacy/stats ───────────────────────────────────────────────
  fastify.get('/stats', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      todayOrders,
      pendingOrders,
      deliveredToday,
      lowStockCount,
      pendingPrescriptions,
      todayAppointments,
      pendingAppointments,
    ] = await Promise.all([
      fastify.prisma.order.count({
        where: { pharmacyId, createdAt: { gte: today }, isActive: true },
      }),
      fastify.prisma.order.count({
        where: { pharmacyId, status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] }, isActive: true },
      }),
      fastify.prisma.order.count({
        where: { pharmacyId, status: 'DELIVERED', updatedAt: { gte: today }, isActive: true },
      }),
      fastify.prisma.medicine.count({
        where: { pharmacyId, isActive: true, stock: { lte: 10 } },
      }),
      fastify.prisma.prescription.count({
        where: { order: { pharmacyId }, status: 'PENDING', isActive: true },
      }),
      fastify.prisma.appointment.count({
        where: {
          doctor: { pharmacyId },
          appointmentDate: { gte: today, lt: tomorrow },
          isActive: true,
        },
      }),
      fastify.prisma.appointment.count({
        where: {
          doctor: { pharmacyId },
          status: { in: ['PENDING', 'CONFIRMED'] },
          isActive: true,
        },
      }),
    ])

    const revenueAgg = await fastify.prisma.order.aggregate({
      where: { pharmacyId, status: 'DELIVERED', updatedAt: { gte: today }, isActive: true },
      _sum:  { totalAmount: true },
    })

    return reply.send(success({
      todayOrders,
      pendingOrders,
      deliveredToday,
      lowStockCount,
      pendingPrescriptions,
      todayAppointments,
      pendingAppointments,
      todayRevenue: revenueAgg._sum.totalAmount ?? 0,
    }))
  })
}

export default pharmacyProfileRoutes
