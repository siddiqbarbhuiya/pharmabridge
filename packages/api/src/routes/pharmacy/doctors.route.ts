import type { FastifyPluginAsync } from 'fastify'
import {
  CreateDoctorSchema,
  UpdateDoctorSchema,
  SetDoctorAvailabilitySchema,
} from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../../utils/response'
import { requireRole } from '../../middleware/requireRole'
import { isPrismaUniqueConflict } from '../../utils/errors'

const DAY_ORDER: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3,
  FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
}

const pharmacyDoctorsRoutes: FastifyPluginAsync = async (fastify) => {
  const preHandler = [fastify.authenticate, requireRole('PHARMACY_OWNER')]

  // ── GET /pharmacy/doctors ─────────────────────────────────────────────
  fastify.get('/doctors', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const doctors = await fastify.prisma.doctor.findMany({
      where:   { pharmacyId },
      include: { availability: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    })

    return reply.send(success(doctors))
  })

  // ── POST /pharmacy/doctors ────────────────────────────────────────────
  fastify.post('/doctors', { preHandler }, async (request, reply) => {
    const { pharmacyId } = request.user
    if (!pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'No pharmacy associated with your account'))
    }

    const parsed = CreateDoctorSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    try {
      const doctor = await fastify.prisma.doctor.create({
        data: { ...parsed.data, pharmacyId },
      })
      return reply.code(201).send(success(doctor, 'Doctor added successfully'))
    } catch (err) {
      if (isPrismaUniqueConflict(err)) {
        return reply.code(409).send(error(ERROR_CODES.DUPLICATE_ENTRY, 'A doctor with this registration number already exists'))
      }
      throw err
    }
  })

  // ── PATCH /pharmacy/doctors/:id ───────────────────────────────────────
  fastify.patch('/doctors/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = UpdateDoctorSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const doctor = await fastify.prisma.doctor.findUnique({ where: { id } })
    if (!doctor) return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))

    if (doctor.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this doctor profile'))
    }

    const updated = await fastify.prisma.doctor.update({ where: { id }, data: parsed.data })
    return reply.send(success(updated, 'Doctor updated successfully'))
  })

  // ── PATCH /pharmacy/doctors/:id/deactivate (soft delete) ─────────────
  fastify.patch('/doctors/:id/deactivate', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const doctor = await fastify.prisma.doctor.findUnique({ where: { id } })
    if (!doctor) return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))

    if (doctor.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this doctor profile'))
    }

    await fastify.prisma.doctor.update({ where: { id }, data: { isActive: false } })
    return reply.send(success(null, 'Doctor deactivated successfully'))
  })

  // ── GET /pharmacy/doctors/:id/availability ────────────────────────────
  fastify.get('/doctors/:id/availability', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const doctor = await fastify.prisma.doctor.findUnique({ where: { id } })
    if (!doctor) return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))

    if (doctor.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this doctor profile'))
    }

    const availability = await fastify.prisma.doctorAvailability.findMany({
      where: { doctorId: id },
    })

    return reply.send(success(
      availability.sort((a, b) => (DAY_ORDER[a.dayOfWeek] ?? 0) - (DAY_ORDER[b.dayOfWeek] ?? 0)),
    ))
  })

  // ── PUT /pharmacy/doctors/:id/availability (full replacement) ─────────
  fastify.put('/doctors/:id/availability', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = SetDoctorAvailabilitySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const doctor = await fastify.prisma.doctor.findUnique({ where: { id } })
    if (!doctor) return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))

    if (doctor.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this doctor profile'))
    }

    const availability = await fastify.prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({ where: { doctorId: id } })
      await tx.doctorAvailability.createMany({
        data: parsed.data.schedules.map((s) => ({ ...s, doctorId: id, isActive: true })),
      })
      return tx.doctorAvailability.findMany({ where: { doctorId: id } })
    })

    return reply.send(success(
      availability.sort((a, b) => (DAY_ORDER[a.dayOfWeek] ?? 0) - (DAY_ORDER[b.dayOfWeek] ?? 0)),
      'Availability schedule updated',
    ))
  })
}

export default pharmacyDoctorsRoutes
