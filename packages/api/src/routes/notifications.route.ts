import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { NotificationType } from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const preHandler = [fastify.authenticate]

  // ── GET /notifications ────────────────────────────────────────────────
  fastify.get('/notifications', { preHandler }, async (request, reply) => {
    const parsed = z.object({
      isRead: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
      type:   NotificationType.optional(),
      page:   z.coerce.number().int().positive().default(1),
      limit:  z.coerce.number().int().positive().max(50).default(20),
    }).safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid query parameters', parsed.error.issues))
    }

    const { isRead, type, page, limit } = parsed.data
    const userId = request.user.userId

    const where = {
      userId,
      ...(isRead !== undefined && { isRead }),
      ...(type              && { type }),
    }

    const [data, total] = await Promise.all([
      fastify.prisma.notification.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        // Unread first, then by newest
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      }),
      fastify.prisma.notification.count({ where }),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // ── PATCH /notifications/:id/read ─────────────────────────────────────
  fastify.patch('/notifications/:id/read', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const notification = await fastify.prisma.notification.findUnique({ where: { id } })
    if (!notification) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Notification not found'))
    }
    if (notification.userId !== request.user.userId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this notification'))
    }

    const updated = await fastify.prisma.notification.update({
      where: { id },
      data:  { isRead: true, readAt: new Date() },
    })

    return reply.send(success(updated, 'Notification marked as read'))
  })

  // ── PATCH /notifications/read-all ─────────────────────────────────────
  fastify.patch('/notifications/read-all', { preHandler }, async (request, reply) => {
    const now    = new Date()
    const userId = request.user.userId

    const { count } = await fastify.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: now },
    })

    return reply.send(success({ updatedCount: count }, 'All notifications marked as read'))
  })
}

export default notificationRoutes
