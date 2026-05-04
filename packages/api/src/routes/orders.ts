import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import type { OrderStatus } from '@pharmabridge/types'
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CancelOrderSchema,
  OrderQuerySchema,
  ORDER_STATUS_TRANSITIONS,
} from '@pharmabridge/types'
import { success, error, ERROR_CODES } from '../utils/response'
import { requireRole } from '../middleware/requireRole'
import { AppError } from '../utils/errors'

const DELIVERY_FEE_THRESHOLD = 500
const DELIVERY_FEE           = 40

const orderInclude = {
  items:    true,
  timeline: { orderBy: { createdAt: 'asc' as const } },
  customer: { select: { id: true, name: true, phone: true } },
  pharmacy: { select: { id: true, name: true, phone: true, logoUrl: true } },
  address:  true,
} as const

const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /orders ─────────────────────────────────────────────────────
  fastify.post('/orders', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = CreateOrderSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const { pharmacyId, addressId, items, paymentMethod, prescriptionUrl, notes } = parsed.data
    const userId = request.user.userId

    const pharmacy = await fastify.prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    if (!pharmacy || !pharmacy.isApproved || !pharmacy.isActive) {
      return reply.code(400).send(error(
        ERROR_CODES.PHARMACY_NOT_APPROVED,
        'This pharmacy is not currently accepting orders',
      ))
    }

    const address = await fastify.prisma.address.findUnique({ where: { id: addressId } })
    if (!address || address.userId !== userId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'Invalid delivery address'))
    }

    // Fetch all medicines, verify they belong to the requested pharmacy
    const medicineIds = [...new Set(items.map((i) => i.medicineId))]
    const medicines   = await fastify.prisma.medicine.findMany({
      where: { id: { in: medicineIds }, pharmacyId, isActive: true },
    })

    if (medicines.length !== medicineIds.length) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'One or more medicines are not available from this pharmacy',
      ))
    }

    const medicineMap = new Map(medicines.map((m) => [m.id, m]))

    // Prescription check (Indian pharma law: Schedule H/H1/X drugs require Rx)
    const requiresPrescription = medicines.some((m) => m.isPrescriptionRequired)
    if (requiresPrescription && !prescriptionUrl) {
      return reply.code(400).send(error(
        ERROR_CODES.PRESCRIPTION_REQUIRED,
        'One or more medicines require a valid prescription. Please upload your prescription.',
      ))
    }

    // Stock pre-check (fast fail before entering transaction)
    for (const item of items) {
      const medicine = medicineMap.get(item.medicineId)!
      if (medicine.stock < item.quantity) {
        return reply.code(409).send(error(
          ERROR_CODES.STOCK_UNAVAILABLE,
          `Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`,
        ))
      }
    }

    // Calculate totals (GST included in price per Indian pharma convention)
    const subtotal    = items.reduce((sum, item) => sum + medicineMap.get(item.medicineId)!.price * item.quantity, 0)
    const deliveryFee = subtotal >= DELIVERY_FEE_THRESHOLD ? 0 : DELIVERY_FEE
    const totalAmount = subtotal + deliveryFee

    const order = await fastify.prisma.$transaction(async (tx) => {
      // Generate order number: PB-YYYY-NNNNN (year-scoped, padded 5-digit sequence)
      const year        = new Date().getFullYear()
      const yearCount   = await tx.order.count({ where: { orderNumber: { startsWith: `PB-${year}-` } } })
      const orderNumber = `PB-${year}-${String(yearCount + 1).padStart(5, '0')}`

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          pharmacyId,
          customerId:    userId,
          addressId,
          paymentMethod,
          prescriptionUrl,
          notes,
          subtotal,
          deliveryFee,
          totalAmount,
          status:        'PENDING',
          paymentStatus: 'PENDING',
        },
      })

      await tx.orderItem.createMany({
        data: items.map((item) => {
          const med = medicineMap.get(item.medicineId)!
          return {
            orderId:      newOrder.id,
            medicineId:   item.medicineId,
            medicineName: med.name,
            quantity:     item.quantity,
            unitPrice:    med.price,
            totalPrice:   med.price * item.quantity,
          }
        }),
      })

      await tx.orderTimeline.create({
        data: { orderId: newOrder.id, status: 'PENDING', note: 'Order placed' },
      })

      // Atomic stock decrement + inventory log per item
      for (const item of items) {
        const med = await tx.medicine.findUniqueOrThrow({ where: { id: item.medicineId } })
        if (med.stock < item.quantity) {
          throw new AppError(409, 'STOCK_UNAVAILABLE', `Insufficient stock for ${med.name}`)
        }
        await tx.medicine.update({
          where: { id: item.medicineId },
          data:  { stock: { decrement: item.quantity } },
        })
        await tx.inventoryLog.create({
          data: {
            medicineId:    item.medicineId,
            action:        'SALE',
            delta:         -item.quantity,
            previousStock: med.stock,
            newStock:      med.stock - item.quantity,
          },
        })
      }

      return tx.order.findUniqueOrThrow({ where: { id: newOrder.id }, include: orderInclude })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    fastify.io.of('/pharmacy').to(`pharmacy:${pharmacyId}`).emit('order:new', {
      orderId:     order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      itemCount:   items.length,
    })

    return reply.code(201).send(success(order, 'Order placed successfully'))
  })

  // ── GET /orders — customer's own ─────────────────────────────────────
  fastify.get('/orders', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parsed = OrderQuerySchema.omit({ customerId: true, pharmacyId: true }).safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        parsed.error.issues,
      ))
    }

    const { status, from, to, page, limit, sortOrder } = parsed.data

    const where: Prisma.OrderWhereInput = {
      customerId: request.user.userId,
      isActive:   true,
    }
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to) }   : {}),
      }
    }

    const [data, total] = await Promise.all([
      fastify.prisma.order.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: sortOrder },
        include: {
          items:    true,
          pharmacy: { select: { id: true, name: true, logoUrl: true } },
        },
      }),
      fastify.prisma.order.count({ where }),
    ])

    return reply.send(success(data, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }))
  })

  // ── GET /orders/:id ──────────────────────────────────────────────────
  fastify.get('/orders/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const order = await fastify.prisma.order.findUnique({ where: { id }, include: orderInclude })

    if (!order || !order.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Order not found'))
    }

    const isOwner    = order.customerId === request.user.userId
    const isPharmacy = request.user.role === 'PHARMACY_OWNER' && order.pharmacyId === request.user.pharmacyId

    if (!isOwner && !isPharmacy) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not have access to this order'))
    }

    return reply.send(success(order))
  })

  // ── PATCH /orders/:id/status — PHARMACY_OWNER ────────────────────────
  fastify.patch('/orders/:id/status', {
    preHandler: [fastify.authenticate, requireRole('PHARMACY_OWNER')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = UpdateOrderStatusSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const order = await fastify.prisma.order.findUnique({ where: { id } })
    if (!order || !order.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Order not found'))
    }

    if (order.pharmacyId !== request.user.pharmacyId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this order'))
    }

    const allowed = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus] ?? []
    if (!allowed.includes(parsed.data.status)) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot transition order from ${order.status} to ${parsed.data.status}`,
      ))
    }

    const updated = await fastify.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where:   { id },
        data:    { status: parsed.data.status },
        include: orderInclude,
      })
      await tx.orderTimeline.create({
        data: { orderId: id, status: parsed.data.status, note: parsed.data.note },
      })
      return u
    })

    fastify.io.of('/customer').to(`user:${order.customerId}`).emit('order:status_updated', {
      orderId:     id,
      orderNumber: order.orderNumber,
      status:      parsed.data.status,
      message:     `Your order is now ${parsed.data.status.toLowerCase().replace(/_/g, ' ')}`,
    })

    return reply.send(success(updated, 'Order status updated'))
  })

  // ── POST /orders/:id/cancel — CUSTOMER ───────────────────────────────
  fastify.post('/orders/:id/cancel', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = CancelOrderSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(error(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error.issues,
      ))
    }

    const order = await fastify.prisma.order.findUnique({
      where:   { id },
      include: { items: true },
    })

    if (!order || !order.isActive) {
      return reply.code(404).send(error(ERROR_CODES.NOT_FOUND, 'Order not found'))
    }

    if (order.customerId !== request.user.userId) {
      return reply.code(403).send(error(ERROR_CODES.FORBIDDEN, 'You do not own this order'))
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return reply.code(400).send(error(
        ERROR_CODES.ORDER_CANNOT_BE_CANCELLED,
        'Orders can only be cancelled when PENDING or CONFIRMED',
      ))
    }

    const updated = await fastify.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where:   { id },
        data:    { status: 'CANCELLED' },
        include: orderInclude,
      })
      await tx.orderTimeline.create({
        data: {
          orderId: id,
          status:  'CANCELLED',
          note:    parsed.data.reason ?? 'Cancelled by customer',
        },
      })

      // Restore stock for each item
      for (const item of order.items) {
        const med = await tx.medicine.findUniqueOrThrow({ where: { id: item.medicineId } })
        await tx.medicine.update({
          where: { id: item.medicineId },
          data:  { stock: { increment: item.quantity } },
        })
        await tx.inventoryLog.create({
          data: {
            medicineId:    item.medicineId,
            action:        'RETURN',
            delta:         item.quantity,
            previousStock: med.stock,
            newStock:      med.stock + item.quantity,
          },
        })
      }

      return u
    })

    fastify.io.of('/pharmacy').to(`pharmacy:${order.pharmacyId}`).emit('order:cancelled', {
      orderId:     id,
      orderNumber: order.orderNumber,
      reason:      parsed.data.reason,
    })

    return reply.send(success(updated, 'Order cancelled successfully'))
  })
}

export default orderRoutes
