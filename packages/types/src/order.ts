import { z } from 'zod'

/* ── Enums ───────────────────────────────────────────────────────────── */

export const OrderStatus = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
])
export type OrderStatus = z.infer<typeof OrderStatus>

export const PaymentMethod = z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'COD'])
export type PaymentMethod = z.infer<typeof PaymentMethod>

export const PaymentStatus = z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
export type PaymentStatus = z.infer<typeof PaymentStatus>

/* ── Valid status transitions (enforced server-side, documented here) ─── */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PROCESSING', 'CANCELLED'],
  PROCESSING:       ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        [],
  CANCELLED:        [],
}

/* ── Order item ─────────────────────────────────────────────────────── */

/** Input: client sends only medicineId + quantity (server computes prices) */
export const OrderItemInputSchema = z.object({
  medicineId: z.string().cuid(),
  quantity:   z.number().int().positive().max(99),
})
export type OrderItemInput = z.infer<typeof OrderItemInputSchema>

/** Full item record returned in API responses */
export const OrderItemSchema = z.object({
  id:           z.string().cuid(),
  orderId:      z.string().cuid(),
  medicineId:   z.string().cuid(),
  medicineName: z.string(),
  quantity:     z.number().int().positive(),
  unitPrice:    z.number().positive(),
  totalPrice:   z.number().positive(),
})
export type OrderItem = z.infer<typeof OrderItemSchema>

/* ── Order timeline ──────────────────────────────────────────────────── */

export const OrderTimelineSchema = z.object({
  id:        z.string().cuid(),
  orderId:   z.string().cuid(),
  status:    OrderStatus,
  note:      z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type OrderTimeline = z.infer<typeof OrderTimelineSchema>

/* ── Create order ────────────────────────────────────────────────────── */

export const CreateOrderSchema = z.object({
  pharmacyId:      z.string().cuid(),
  addressId:       z.string().cuid(),
  items:           z.array(OrderItemInputSchema).min(1, 'Order must have at least one item'),
  paymentMethod:   PaymentMethod,
  prescriptionUrl: z.string().url().optional(),
  notes:           z.string().max(500).optional(),
})
export type CreateOrder = z.infer<typeof CreateOrderSchema>

/* ── Base order record (list views) ──────────────────────────────────── */

export const OrderSchema = z.object({
  id:                z.string().cuid(),
  orderNumber:       z.string(),
  status:            OrderStatus,
  paymentStatus:     PaymentStatus,
  paymentMethod:     PaymentMethod,
  razorpayOrderId:   z.string().nullable(),
  razorpayPaymentId: z.string().nullable(),
  subtotal:          z.number(),
  deliveryFee:       z.number(),
  totalAmount:       z.number(),
  prescriptionUrl:   z.string().url().nullable(),
  notes:             z.string().nullable(),
  customerId:        z.string().cuid(),
  pharmacyId:        z.string().cuid(),
  addressId:         z.string().cuid(),
  isActive:          z.boolean(),
  createdAt:         z.string().datetime(),
  updatedAt:         z.string().datetime(),
})
export type Order = z.infer<typeof OrderSchema>

/* ── Order with full details (detail view) ───────────────────────────── */

export const OrderWithDetailsSchema = OrderSchema.extend({
  items:    z.array(OrderItemSchema),
  timeline: z.array(OrderTimelineSchema),
  customer: z.object({
    id:    z.string().cuid(),
    name:  z.string().nullable(),
    phone: z.string(),
  }),
  pharmacy: z.object({
    id:      z.string().cuid(),
    name:    z.string(),
    phone:   z.string(),
    logoUrl: z.string().url().nullable(),
  }),
  address: z.object({
    line1:    z.string(),
    line2:    z.string().nullable(),
    city:     z.string(),
    state:    z.string(),
    pincode:  z.string(),
    landmark: z.string().nullable(),
  }),
})
export type OrderWithDetails = z.infer<typeof OrderWithDetailsSchema>

/* ── Mutations ───────────────────────────────────────────────────────── */

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatus,
  note:   z.string().max(500).optional(),
})
export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>

export const CancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
})
export type CancelOrder = z.infer<typeof CancelOrderSchema>

/* ── Query schemas ───────────────────────────────────────────────────── */

export const OrderQuerySchema = z.object({
  status:     OrderStatus.optional(),
  pharmacyId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  from:       z.string().datetime().optional(),
  to:         z.string().datetime().optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
})
export type OrderQuery = z.infer<typeof OrderQuerySchema>

/* ── Razorpay payment verification ───────────────────────────────────── */

export const RazorpayOrderSchema = z.object({
  orderId:        z.string().cuid(),
  razorpayOrderId: z.string(),
  amount:          z.number().positive(),   // paise
  currency:        z.literal('INR').default('INR'),
})
export type RazorpayOrder = z.infer<typeof RazorpayOrderSchema>

export const RazorpayVerifySchema = z.object({
  razorpay_order_id:   z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature:  z.string(),
})
export type RazorpayVerify = z.infer<typeof RazorpayVerifySchema>
