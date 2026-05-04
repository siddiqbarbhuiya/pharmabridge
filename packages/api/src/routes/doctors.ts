import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { DoctorQuerySchema } from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { generateAvailableSlots } from '../utils/slots'

const pharmacySelect = {
  id:      true,
  name:    true,
  phone:   true,
  address: true,
  logoUrl: true,
  lat:     true,
  lng:     true,
} as const

const doctorRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /doctors?specialty=&pharmacyId=&search= ──────────────────────
  fastify.get('/doctors', async (request, reply) => {
    const parsed = DoctorQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const { specialty, search, isVerified, language, minFee, maxFee, page, limit, sortBy, sortOrder } = parsed.data
    const pharmacyId = (request.query as Record<string, string>).pharmacyId

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      isActive: true,
      pharmacy: { isApproved: true, isActive: true },
    }

    if (specialty)             where.specialty   = specialty
    if (pharmacyId)            where.pharmacyId  = pharmacyId
    if (isVerified !== undefined) where.isVerified = isVerified
    if (language)              where.languages   = { has: language }
    if (search)                where.name        = { contains: search, mode: 'insensitive' }

    if (minFee !== undefined || maxFee !== undefined) {
      where.consultationFee = {}
      if (minFee !== undefined) where.consultationFee.gte = minFee
      if (maxFee !== undefined) where.consultationFee.lte = maxFee
    }

    const [data, total] = await Promise.all([
      fastify.prisma.doctor.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { [sortBy]: sortOrder },
        include: { pharmacy: { select: pharmacySelect } },
      }),
      fastify.prisma.doctor.count({ where }),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // ── GET /doctors/:id ─────────────────────────────────────────────────
  fastify.get('/doctors/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const doctor = await fastify.prisma.doctor.findUnique({
      where:   { id },
      include: {
        pharmacy:     { select: pharmacySelect },
        availability: {
          where:   { isActive: true },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    })

    if (!doctor || !doctor.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))
    }

    return reply.send(success(doctor))
  })

  // ── GET /doctors/:id/slots?date=YYYY-MM-DD ───────────────────────────
  fastify.get('/doctors/:id/slots', async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    }).safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const [year, month, day] = parsed.data.date.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Date cannot be in the past'))
    }

    const doctor = await fastify.prisma.doctor.findUnique({ where: { id } })
    if (!doctor || !doctor.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Doctor not found'))
    }

    const slots = await generateAvailableSlots(id, date, fastify.prisma)
    return reply.send(success(slots))
  })
}

export default doctorRoutes
