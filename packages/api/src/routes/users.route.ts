import type { FastifyPluginAsync } from 'fastify'
import { UpdateUserSchema } from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // ── GET /users/me ────────────────────────────────────────────────────
  fastify.get('/users/me', async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where:  { id: request.user.userId },
      select: { id: true, phone: true, name: true, email: true, role: true, createdAt: true },
    })
    if (!user) return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'User not found'))
    return reply.send(success(user))
  })

  // ── PATCH /users/me ───────────────────────────────────────────────────
  fastify.patch('/users/me', async (request, reply) => {
    const parsed = UpdateUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const updated = await fastify.prisma.user.update({
      where:  { id: request.user.userId },
      data:   parsed.data,
      select: { id: true, phone: true, name: true, email: true, role: true, createdAt: true },
    })

    return reply.send(success(updated, 'Profile updated'))
  })
}

export default userRoutes
