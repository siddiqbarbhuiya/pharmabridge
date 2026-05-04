import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@pharmabridge/types'

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      })
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource' },
      })
    }
  }
}
