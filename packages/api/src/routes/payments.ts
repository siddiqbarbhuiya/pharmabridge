import { createHmac } from 'crypto'
import Razorpay from 'razorpay'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { success, error, ERROR_CODES } from '../utils/response'

// Augment FastifyRequest so rawBody is accessible inside the webhook route
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

const razorpay = new Razorpay({
  key_id:     config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
})

const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /payments/create-order ──────────────────────────────────────
  fastify.post('/payments/create-order', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = z.object({ orderId: z.string().cuid() }).safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid request body', parsed.error.issues))
    }

    const order = await fastify.prisma.order.findUnique({ where: { id: parsed.data.orderId } })
    if (!order || !order.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Order not found'))
    }

    if (order.customerId !== request.user.userId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this order'))
    }

    if (order.paymentMethod === 'COD') {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'COD orders do not require online payment'))
    }

    if (order.paymentStatus === 'PAID') {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Order is already paid'))
    }

    const rzpOrder = await razorpay.orders.create({
      amount:          Math.round(order.totalAmount * 100), // paise
      currency:        'INR',
      receipt:         order.orderNumber,
      notes:           { orderId: order.id, orderNumber: order.orderNumber },
    })

    await fastify.prisma.order.update({
      where: { id: order.id },
      data:  { razorpayOrderId: rzpOrder.id },
    })

    return reply.send(success({
      razorpayOrderId: rzpOrder.id,
      amount:          rzpOrder.amount,
      currency:        rzpOrder.currency,
      key:             config.RAZORPAY_KEY_ID,
      orderNumber:     order.orderNumber,
    }, 'Payment order created'))
  })

  // ── POST /payments/verify ────────────────────────────────────────────
  fastify.post('/payments/verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = z.object({
      razorpay_order_id:   z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature:  z.string(),
      orderId:             z.string().cuid(),
    }).safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send(error(ERROR_CODES.VALIDATION_ERROR, 'Invalid request body', parsed.error.issues))
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = parsed.data

    const expectedSig = createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSig !== razorpay_signature) {
      return reply.code(400).send(error(ERROR_CODES.PAYMENT_VERIFICATION_FAILED, 'Payment signature verification failed'))
    }

    const order = await fastify.prisma.order.findUnique({ where: { id: orderId } })
    if (!order || !order.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Order not found'))
    }

    if (order.customerId !== request.user.userId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this order'))
    }

    const updated = await fastify.prisma.order.update({
      where: { id: orderId },
      data:  { paymentStatus: 'PAID', razorpayPaymentId: razorpay_payment_id },
    })

    fastify.io.of('/customer').to(`user:${order.customerId}`).emit('payment:verified', {
      orderId:     order.id,
      orderNumber: order.orderNumber,
      paymentId:   razorpay_payment_id,
    })

    return reply.send(success({ orderId: updated.id, paymentStatus: updated.paymentStatus }, 'Payment verified successfully'))
  })

  // ── POST /payments/webhook — Razorpay webhook (no auth) ───────────────
  // This is a scoped plugin so its content-type override doesn't bleed out
  fastify.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      try {
        const raw = body as Buffer
        _req.rawBody = raw
        done(null, JSON.parse(raw.toString('utf-8')))
      } catch (err) {
        done(err as Error, undefined)
      }
    })

    scope.post('/payments/webhook', async (request, reply) => {
      const signature = request.headers['x-razorpay-signature'] as string | undefined
      const webhookSecret = config.RAZORPAY_WEBHOOK_SECRET

      if (webhookSecret && request.rawBody) {
        if (!signature) {
          return reply.code(400).send({ success: false })
        }
        const expected = createHmac('sha256', webhookSecret)
          .update(request.rawBody)
          .digest('hex')
        if (expected !== signature) {
          return reply.code(400).send({ success: false })
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = request.body as any
      const event   = payload?.event as string | undefined

      if (!event) return reply.send({ success: true })

      try {
        if (event === 'payment.captured') {
          const paymentEntity = payload.payload?.payment?.entity
          const rzpOrderId    = paymentEntity?.order_id as string | undefined
          const paymentId     = paymentEntity?.id       as string | undefined
          if (rzpOrderId && paymentId) {
            await fastify.prisma.order.updateMany({
              where: { razorpayOrderId: rzpOrderId, paymentStatus: { not: 'PAID' } },
              data:  { paymentStatus: 'PAID', razorpayPaymentId: paymentId },
            })
          }

        } else if (event === 'payment.failed') {
          const paymentEntity = payload.payload?.payment?.entity
          const rzpOrderId    = paymentEntity?.order_id as string | undefined
          if (rzpOrderId) {
            await fastify.prisma.order.updateMany({
              where: { razorpayOrderId: rzpOrderId, paymentStatus: 'PENDING' },
              data:  { paymentStatus: 'FAILED' },
            })
          }

        } else if (event === 'refund.processed') {
          const refundEntity = payload.payload?.refund?.entity
          const paymentId    = refundEntity?.payment_id as string | undefined
          if (paymentId) {
            await fastify.prisma.order.updateMany({
              where: { razorpayPaymentId: paymentId },
              data:  { paymentStatus: 'REFUNDED' },
            })
          }
        }
      } catch (err) {
        fastify.log.error(err, 'Webhook handler error')
      }

      return reply.send({ success: true })
    })
  })
}

export default paymentRoutes
