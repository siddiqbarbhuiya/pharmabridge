import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppointmentStatus } from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../../utils/response'
import { requireRole } from '../../middleware/requireRole'

// Only the transitions a pharmacy can drive (user-driven cancellation is in customer routes)
const PHARMACY_TRANSITIONS: Partial<Record<string, string[]>> = {
  PENDING:   ['CONFIRMED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW'],
}

const appointmentInclude = {
  doctor: {
    select: { id: true, name: true, specialty: true, pharmacyId: true },
  },
  customer: { select: { id: true, name: true, phone: true } },
} as const

const pharmacyAppointmentRoutes: FastifyPluginAsync = async (fastify) => {
  const preHandler = [fastify.authenticate, requireRole('PHARMACY_OWNER')]

  // ── GET /pharmacy/appointments ────────────────────────────────────────
  fastify.get('/appointments', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const QuerySchema = z.object({
      status:    AppointmentStatus.optional(),
      doctorId:  z.string().cuid().optional(),
      from:      z.string().date().optional(),
      to:        z.string().date().optional(),
      page:      z.coerce.number().int().positive().default(1),
      limit:     z.coerce.number().int().positive().max(100).default(20),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })

    const parsed = QuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const { status, doctorId, from, to, page, limit, sortOrder } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      isActive: true,
      doctor:   { pharmacyId },
    }

    if (status)   where.status   = status
    if (doctorId) where.doctorId = doctorId

    if (from || to) {
      where.appointmentDate = {}
      if (from) where.appointmentDate.gte = new Date(from)
      if (to)   where.appointmentDate.lte = new Date(to)
    }

    const [data, total] = await Promise.all([
      fastify.prisma.appointment.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { appointmentDate: sortOrder },
        include: appointmentInclude,
      }),
      fastify.prisma.appointment.count({ where }),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // ── PATCH /pharmacy/appointments/:id/status ───────────────────────────
  fastify.patch('/appointments/:id/status', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = z.object({
      status: AppointmentStatus,
      note:   z.string().max(500).optional(),
    }).safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const appointment = await fastify.prisma.appointment.findUnique({
      where:   { id },
      include: {
        doctor:   { select: { pharmacyId: true } },
        customer: { select: { id: true, name: true, phone: true, fcmToken: true } },
      },
    })

    if (!appointment || !appointment.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Appointment not found'))
    }

    if (appointment.doctor.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not have access to this appointment'))
    }

    const allowed = PHARMACY_TRANSITIONS[appointment.status] ?? []
    if (!allowed.includes(parsed.data.status)) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot transition from ${appointment.status} to ${parsed.data.status}`,
      ))
    }

    const updated = await fastify.prisma.appointment.update({
      where: { id },
      data:  {
        status: parsed.data.status,
        notes:  parsed.data.note ?? appointment.notes,
      },
      include: appointmentInclude,
    })

    // Notify customer via WebSocket on every status change
    fastify.io.of('/customer').to(`user:${appointment.customerId}`).emit('appointment:status_updated', {
      appointmentId:     id,
      appointmentNumber: appointment.appointmentNumber,
      status:            parsed.data.status,
      note:              parsed.data.note,
    })

    return reply.send(success(updated, `Appointment ${parsed.data.status.toLowerCase()} successfully`))
  })
}

export default pharmacyAppointmentRoutes
