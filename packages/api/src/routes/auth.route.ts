import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import { SendOtpSchema, VerifyOtpSchema } from '@pharmabridge/types'
import type { AuthTokenPayload } from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { signAccessToken, signRefreshToken, verifyRefreshToken, generateOtp } from '../utils/jwt'
import { config } from '../config'

const OTP_TTL       = 600              // 10 minutes (seconds)
const OTP_RATE_TTL  = 3_600            // 1 hour (seconds)
const OTP_RATE_MAX  = 5
const REFRESH_TTL_S = 30 * 24 * 3_600 // 30 days (seconds)

function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie('pb_refresh_token', token, {
    httpOnly: true,
    secure:   config.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/api/v1/auth',
    maxAge:   REFRESH_TTL_S,
  })
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /auth/send-otp ──────────────────────────────────────────────
  fastify.post('/auth/send-otp', async (request, reply) => {
    const parsed = SendOtpSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid phone number',
        parsed.error.issues,
      ))
    }

    const { phone } = parsed.data
    const rateKey   = `otp:rate:${phone}`

    const count = await fastify.redis.incr(rateKey)
    if (count === 1) await fastify.redis.expire(rateKey, OTP_RATE_TTL)
    if (count > OTP_RATE_MAX) {
      return reply.code(429).send(error(
        ERROR_CODES.OTP_LIMIT_EXCEEDED,
        'Too many OTP requests. Please wait an hour before trying again.',
      ))
    }

    const otp       = generateOtp()
    const requestId = randomUUID()

    await fastify.redis.set(
      `otp:${phone}`,
      JSON.stringify({ otp, requestId }),
      'EX',
      OTP_TTL,
    )

    // Dev: log to console. Production: send via MSG91.
    fastify.log.info({ phone, otp }, '[AUTH] OTP generated')

    return reply.send(success({ requestId, expiresIn: OTP_TTL }))
  })

  // ── POST /auth/verify-otp ─────────────────────────────────────────────
  fastify.post('/auth/verify-otp', async (request, reply) => {
    const parsed = VerifyOtpSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid input',
        parsed.error.issues,
      ))
    }

    const { phone, otp } = parsed.data
    const stored = await fastify.redis.get(`otp:${phone}`)

    if (!stored) {
      return reply.code(400).send(error(
        ERROR_CODES.OTP_EXPIRED,
        'OTP has expired. Please request a new one.',
      ))
    }

    const { otp: storedOtp } = JSON.parse(stored) as { otp: string; requestId: string }

    if (storedOtp !== otp) {
      return reply.code(400).send(error(
        ERROR_CODES.INVALID_OTP,
        'Incorrect OTP. Please try again.',
      ))
    }

    // Consume OTP immediately — prevent reuse
    await fastify.redis.del(`otp:${phone}`)

    // Upsert user: create on first login, fetch on subsequent logins
    const user = await fastify.prisma.user.upsert({
      where:   { phone },
      update:  {},
      create:  { phone, role: 'CUSTOMER', consentGivenAt: new Date() },
      include: { pharmacy: { select: { id: true } } },
    })

    if (!user.isActive) {
      return reply.code(403).send(error(
        ERROR_CODES.FORBIDDEN,
        'Your account has been deactivated. Please contact support.',
      ))
    }

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      role:   user.role,
      ...(user.pharmacy ? { pharmacyId: user.pharmacy.id } : {}),
    }

    const accessToken                  = signAccessToken(tokenPayload)
    const { token: refreshToken, jti } = signRefreshToken(user.id)

    await fastify.redis.set(`refresh:${user.id}`, jti, 'EX', REFRESH_TTL_S)
    setRefreshCookie(reply, refreshToken)

    return reply.send(success({
      user: {
        id:    user.id,
        phone: user.phone,
        name:  user.name,
        role:  user.role,
      },
      accessToken,
    }))
  })

  // ── POST /auth/refresh ────────────────────────────────────────────────
  fastify.post('/auth/refresh', async (request, reply) => {
    const rawToken = request.cookies['pb_refresh_token']

    if (!rawToken) {
      return reply.code(401).send(error(
        ERROR_CODES.UNAUTHORIZED,
        'No refresh token provided',
      ))
    }

    let payload: { userId: string; jti: string }
    try {
      payload = verifyRefreshToken(rawToken)
    } catch {
      return reply.code(401).send(error(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid or expired refresh token',
      ))
    }

    // Rotation check: jti must match the stored value for this user
    const storedJti = await fastify.redis.get(`refresh:${payload.userId}`)
    if (!storedJti || storedJti !== payload.jti) {
      // Token already rotated or revoked — possible replay attack
      await fastify.redis.del(`refresh:${payload.userId}`)
      reply.clearCookie('pb_refresh_token', { path: '/api/v1/auth' })
      return reply.code(401).send(error(
        ERROR_CODES.UNAUTHORIZED,
        'Refresh token has been revoked',
      ))
    }

    const user = await fastify.prisma.user.findUnique({
      where:   { id: payload.userId, isActive: true },
      include: { pharmacy: { select: { id: true } } },
    })

    if (!user) {
      return reply.code(401).send(error(
        ERROR_CODES.UNAUTHORIZED,
        'User not found or deactivated',
      ))
    }

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      role:   user.role,
      ...(user.pharmacy ? { pharmacyId: user.pharmacy.id } : {}),
    }

    const accessToken                             = signAccessToken(tokenPayload)
    const { token: newRefreshToken, jti: newJti } = signRefreshToken(user.id)

    // Rotate: overwrite old jti with new one
    await fastify.redis.set(`refresh:${user.id}`, newJti, 'EX', REFRESH_TTL_S)
    setRefreshCookie(reply, newRefreshToken)

    return reply.send(success({ accessToken }))
  })

  // ── POST /auth/logout ─────────────────────────────────────────────────
  fastify.post('/auth/logout', async (request, reply) => {
    const rawToken = request.cookies['pb_refresh_token']

    if (rawToken) {
      try {
        const { userId } = verifyRefreshToken(rawToken)
        await fastify.redis.del(`refresh:${userId}`)
      } catch {
        // Token already expired or invalid — still clear the cookie
      }
    }

    reply.clearCookie('pb_refresh_token', { path: '/api/v1/auth' })
    return reply.send(success(null, 'Logged out successfully'))
  })
}

export default authRoutes
