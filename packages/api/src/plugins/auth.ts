import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { config } from '../config'
import { authenticateUser } from '../middleware/authenticateUser'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticateUser
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  // Cookie plugin (needed to read pb_refresh_token in /auth/refresh)
  await fastify.register(cookie)

  // JWT plugin — used only for access token verification via request.jwtVerify()
  // Refresh tokens are signed/verified separately with jsonwebtoken (different secret)
  await fastify.register(jwt, {
    secret: config.JWT_ACCESS_SECRET,
  })

  fastify.decorate('authenticate', authenticateUser)
})

export default authPlugin
