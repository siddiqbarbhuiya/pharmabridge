import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { config } from './config'
import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import authPlugin from './plugins/auth'
import socketPlugin from './plugins/socket'
import healthRoutes from './routes/health.route'
import authRoutes from './routes/auth.route'
import pharmacyRoutes from './routes/pharmacies.route'
import medicineRoutes from './routes/medicines.route'
import prescriptionRoutes from './routes/prescriptions.route'
import doctorRoutes from './routes/doctors'
import appointmentRoutes from './routes/appointments'
import pharmacyDoctorRoutes from './routes/pharmacy/doctors.route'
import pharmacyAppointmentRoutes from './routes/pharmacy/appointments.route'
import pharmacyProfileRoutes from './routes/pharmacy/profile.route'
import orderRoutes from './routes/orders'
import paymentRoutes from './routes/payments'
import promoCardRoutes from './routes/promo-cards.route'
import addressRoutes from './routes/addresses'
import userRoutes from './routes/users.route'
import notificationServicePlugin from './services/notification.service'
import notificationRoutes from './routes/notifications.route'
import { AppError } from './utils/errors'
// Side-effect imports: start BullMQ workers when the server process boots
import './queues/notification.queue'
import './queues/appointment.queue'

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  })

  // ── Security & transport ─────────────────────────────────────────────
  await fastify.register(helmet, { global: true })

  await fastify.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Too many requests, please slow down' },
    }),
  })

  await fastify.register(multipart, {
    limits: {
      fileSize:  5 * 1024 * 1024, // 5 MB
      files:     1,
      fieldSize: 1024,
    },
  })

  // ── Auth (cookie + JWT + authenticate decorator) ─────────────────────
  await fastify.register(authPlugin)

  // ── Infrastructure ───────────────────────────────────────────────────
  await fastify.register(prismaPlugin)
  await fastify.register(redisPlugin)

  // ── WebSockets ───────────────────────────────────────────────────────
  await fastify.register(socketPlugin)

  // ── Notification service (depends on prisma + io) ────────────────────
  await fastify.register(notificationServicePlugin)

  // ── Routes ───────────────────────────────────────────────────────────
  await fastify.register(healthRoutes,      { prefix: '/api/v1' })
  await fastify.register(authRoutes,        { prefix: '/api/v1' })
  await fastify.register(pharmacyRoutes,          { prefix: '/api/v1' })
  await fastify.register(medicineRoutes,          { prefix: '/api/v1' })
  await fastify.register(prescriptionRoutes,      { prefix: '/api/v1' })
  await fastify.register(doctorRoutes,            { prefix: '/api/v1' })
  await fastify.register(appointmentRoutes,       { prefix: '/api/v1' })
  await fastify.register(pharmacyDoctorRoutes,    { prefix: '/api/v1/pharmacy' })
  await fastify.register(pharmacyAppointmentRoutes, { prefix: '/api/v1/pharmacy' })
  await fastify.register(pharmacyProfileRoutes,    { prefix: '/api/v1/pharmacy' })
  await fastify.register(orderRoutes,             { prefix: '/api/v1' })
  await fastify.register(paymentRoutes,           { prefix: '/api/v1' })
  await fastify.register(promoCardRoutes,         { prefix: '/api/v1' })
  await fastify.register(addressRoutes,           { prefix: '/api/v1' })
  await fastify.register(userRoutes,              { prefix: '/api/v1' })
  await fastify.register(notificationRoutes,      { prefix: '/api/v1' })

  // ── Global error handler ─────────────────────────────────────────────
  fastify.setErrorHandler((err, _request, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        success: false,
        error: { code: err.code, message: err.message },
      })
    }

    // Fastify validation errors (schema mismatch)
    if (err instanceof Error && 'validation' in err && err.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: (err as { validation: unknown }).validation,
        },
      })
    }

    fastify.log.error(err)
    const statusCode = err instanceof Error && 'statusCode' in err
      ? (err as { statusCode: number }).statusCode
      : 500
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return reply.code(statusCode ?? 500).send({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message:
          config.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : message,
      },
    })
  })

  // 404 handler
  fastify.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  })

  return fastify
}
