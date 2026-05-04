import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import {
  BookAppointmentSchema,
  AppointmentQuerySchema,
  APPOINTMENT_STATUS_TRANSITIONS,
} from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { SlotUnavailableError, ConflictError } from '../utils/errors'
import { canCancelAppointment } from '../utils/slots'

const DAY_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function slotEndTime(startTime: string, durationMins: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const total  = h * 60 + m + durationMins
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

const appointmentInclude = {
  doctor: {
    include: {
      pharmacy: {
        select: { id: true, name: true, phone: true, address: true, logoUrl: true },
      },
    },
  },
  customer: { select: { id: true, name: true, phone: true } },
} as const

const appointmentRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /appointments ───────────────────────────────────────────────
  fastify.post('/appointments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = BookAppointmentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const { doctorId, appointmentDate: dateStr, startTime, consultationType, symptoms } = parsed.data
    const userId = request.user.userId

    // Parse date as local (server TZ = IST)
    const [y, mo, d] = dateStr.split('-').map(Number)
    const appointmentDate = new Date(y, mo - 1, d)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (appointmentDate < today) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Cannot book appointments in the past'))
    }

    const doctor = await fastify.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { pharmacy: { select: { id: true, name: true, phone: true, address: true, logoUrl: true } } },
    })

    if (!doctor || !doctor.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))
    }

    if (!doctor.pharmacy.id) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor\'s pharmacy not found'))
    }

    const appointment = await fastify.prisma.$transaction(async (tx) => {
      const start = new Date(appointmentDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(appointmentDate)
      end.setHours(23, 59, 59, 999)

      const dayName = DAY_OF_WEEK[appointmentDate.getDay()]

      // Verify slot is still available
      const avail = await tx.doctorAvailability.findFirst({
        where: { doctorId, dayOfWeek: dayName, isActive: true },
      })
      if (!avail) throw new SlotUnavailableError()

      const slotCount = await tx.appointment.count({
        where: {
          doctorId,
          appointmentDate: { gte: start, lte: end },
          startTime,
          status: { in: ['PENDING', 'CONFIRMED'] },
          isActive: true,
        },
      })
      if (slotCount >= avail.maxSlots) throw new SlotUnavailableError()

      // One booking per user per doctor per day
      const duplicate = await tx.appointment.findFirst({
        where: {
          customerId: userId,
          doctorId,
          appointmentDate: { gte: start, lte: end },
          status: { in: ['PENDING', 'CONFIRMED'] },
          isActive: true,
        },
      })
      if (duplicate) throw new ConflictError('You already have an appointment with this doctor on this date')

      const count             = await tx.appointment.count()
      const appointmentNumber = `PB-APT-${String(count + 1).padStart(5, '0')}`
      const endTime           = slotEndTime(startTime, avail.slotMins)

      return tx.appointment.create({
        data: {
          appointmentNumber,
          appointmentDate,
          startTime,
          endTime,
          status:          'PENDING',
          consultationType,
          symptoms,
          fee:             doctor.consultationFee,
          paymentStatus:   'PENDING',
          customerId:      userId,
          doctorId,
        },
        include: appointmentInclude,
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    // Notify pharmacy
    fastify.io.of('/pharmacy').to(`pharmacy:${doctor.pharmacyId}`).emit('appointment:new', {
      appointmentId:     appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      doctorId:          appointment.doctorId,
      date:              appointment.appointmentDate,
      startTime:         appointment.startTime,
    })

    return reply.code(201).send(success(appointment, 'Appointment booked successfully'))
  })

  // ── GET /appointments — user's own, paginated ────────────────────────
  fastify.get('/appointments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const QuerySchema = AppointmentQuerySchema.omit({ customerId: true })
    const parsed = QuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const { status, doctorId, consultationType, from, to, page, limit, sortOrder } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      customerId: request.user.userId,
      isActive:   true,
    }

    if (status)          where.status          = status
    if (doctorId)        where.doctorId        = doctorId
    if (consultationType) where.consultationType = consultationType

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

  // ── GET /appointments/:id ────────────────────────────────────────────
  fastify.get('/appointments/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const appointment = await fastify.prisma.appointment.findUnique({
      where:   { id },
      include: appointmentInclude,
    })

    if (!appointment || !appointment.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Appointment not found'))
    }

    if (appointment.customerId !== request.user.userId && request.user.role === 'CUSTOMER') {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this appointment'))
    }

    return reply.send(success(appointment))
  })

  // ── POST /appointments/:id/cancel ─────────────────────────────────────
  fastify.post('/appointments/:id/cancel', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = z.object({
      reason: z.string().max(500).optional(),
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
      include: { doctor: { select: { pharmacyId: true } } },
    })

    if (!appointment || !appointment.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Appointment not found'))
    }

    if (appointment.customerId !== request.user.userId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this appointment'))
    }

    if (!APPOINTMENT_STATUS_TRANSITIONS[appointment.status].includes('CANCELLED')) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot cancel an appointment with status ${appointment.status}`,
      ))
    }

    if (!canCancelAppointment(appointment.appointmentDate, appointment.startTime)) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Cancellation window has passed. Appointments must be cancelled at least 2 hours before the scheduled time.',
      ))
    }

    const updated = await fastify.prisma.appointment.update({
      where: { id },
      data:  {
        status: 'CANCELLED',
        notes:  parsed.data.reason ?? appointment.notes,
      },
      include: appointmentInclude,
    })

    // Notify pharmacy
    fastify.io.of('/pharmacy').to(`pharmacy:${appointment.doctor.pharmacyId}`).emit('appointment:cancelled', {
      appointmentId:     id,
      appointmentNumber: appointment.appointmentNumber,
      reason:            parsed.data.reason,
    })

    return reply.send(success(updated, 'Appointment cancelled successfully'))
  })
}

export default appointmentRoutes
