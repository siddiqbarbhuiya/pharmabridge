import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthTokenPayload } from '@pharmabridge/types'

// Augment FastifyJWT so request.user is typed as AuthTokenPayload everywhere
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload
    user: AuthTokenPayload
  }
}

export async function authenticateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication token' },
    })
  }
}
