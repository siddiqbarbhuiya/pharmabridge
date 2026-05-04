import type { FastifyPluginAsync } from 'fastify'
import { CreateAddressSchema, UpdateAddressSchema } from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'

const addressRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // ── GET /users/addresses ─────────────────────────────────────────────
  fastify.get('/users/addresses', async (request, reply) => {
    const addresses = await fastify.prisma.address.findMany({
      where:   { userId: request.user.userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    })
    return reply.send(success(addresses))
  })

  // ── POST /users/addresses ────────────────────────────────────────────
  fastify.post('/users/addresses', async (request, reply) => {
    const parsed = CreateAddressSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const userId = request.user.userId
    const count  = await fastify.prisma.address.count({ where: { userId } })
    const isDefault = parsed.data.isDefault || count === 0

    if (isDefault) {
      await fastify.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data:  { isDefault: false },
      })
    }

    const address = await fastify.prisma.address.create({
      data: { ...parsed.data, userId, isDefault },
    })

    return reply.code(201).send(success(address, 'Address saved'))
  })

  // ── PATCH /users/addresses/:id ───────────────────────────────────────
  fastify.patch('/users/addresses/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateAddressSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const existing = await fastify.prisma.address.findUnique({ where: { id } })
    if (!existing || existing.userId !== request.user.userId) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Address not found'))
    }

    if (parsed.data.isDefault) {
      await fastify.prisma.address.updateMany({
        where: { userId: request.user.userId, isDefault: true, id: { not: id } },
        data:  { isDefault: false },
      })
    }

    const updated = await fastify.prisma.address.update({ where: { id }, data: parsed.data })
    return reply.send(success(updated, 'Address updated'))
  })

  // ── DELETE /users/addresses/:id ──────────────────────────────────────
  fastify.delete('/users/addresses/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await fastify.prisma.address.findUnique({ where: { id } })
    if (!existing || existing.userId !== request.user.userId) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Address not found'))
    }

    await fastify.prisma.address.delete({ where: { id } })

    if (existing.isDefault) {
      const next = await fastify.prisma.address.findFirst({
        where:   { userId: request.user.userId },
        orderBy: { id: 'desc' },
      })
      if (next) {
        await fastify.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }

    return reply.send(success(null, 'Address deleted'))
  })

  // ── PATCH /users/addresses/:id/default ──────────────────────────────
  fastify.patch('/users/addresses/:id/default', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await fastify.prisma.address.findUnique({ where: { id } })
    if (!existing || existing.userId !== request.user.userId) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Address not found'))
    }

    await fastify.prisma.$transaction([
      fastify.prisma.address.updateMany({
        where: { userId: request.user.userId, isDefault: true },
        data:  { isDefault: false },
      }),
      fastify.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ])

    return reply.send(success(null, 'Default address updated'))
  })
}

export default addressRoutes
