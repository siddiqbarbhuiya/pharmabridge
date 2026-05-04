import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { Server } from 'socket.io'
import type { AuthTokenPayload } from '@pharmabridge/types'
import { config } from '../config'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }
}

const socketPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const io = new Server(fastify.server, {
    cors: {
      origin: config.CORS_ORIGIN.split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // JWT auth for all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) return next(new Error('UNAUTHORIZED'))
    try {
      const payload = fastify.jwt.verify<AuthTokenPayload>(token)
      socket.data.user = payload
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  // Namespace: /customer
  io.of('/customer').use((socket, next) => {
    const user = socket.data.user as AuthTokenPayload | undefined
    if (!user || user.role !== 'CUSTOMER') return next(new Error('FORBIDDEN'))
    socket.join(`user:${user.userId}`)
    next()
  })

  // Namespace: /pharmacy
  io.of('/pharmacy').use((socket, next) => {
    const user = socket.data.user as AuthTokenPayload | undefined
    if (!user || user.role !== 'PHARMACY_OWNER') return next(new Error('FORBIDDEN'))
    if (user.pharmacyId) socket.join(`pharmacy:${user.pharmacyId}`)
    next()
  })

  // Namespace: /admin
  io.of('/admin').use((socket, next) => {
    const user = socket.data.user as AuthTokenPayload | undefined
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return next(new Error('FORBIDDEN'))
    socket.join('admin')
    next()
  })

  fastify.decorate('io', io)

  fastify.addHook('onClose', async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()))
  })
})

export default socketPlugin
