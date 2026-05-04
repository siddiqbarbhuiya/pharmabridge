import { z } from 'zod'

/* ── Enum ────────────────────────────────────────────────────────────── */

export const NotificationType = z.enum([
  'ORDER_UPDATE',
  'PRESCRIPTION_STATUS',
  'APPOINTMENT_UPDATE',
  'SYSTEM',
  'PROMOTIONAL',
])
export type NotificationType = z.infer<typeof NotificationType>

/* ── Full notification record (API read) ─────────────────────────────── */

export const NotificationSchema = z.object({
  id:        z.string().cuid(),
  type:      NotificationType,
  title:     z.string(),
  body:      z.string(),
  data:      z.record(z.unknown()).nullable(),
  isRead:    z.boolean(),
  readAt:    z.string().datetime().nullable(),
  userId:    z.string().cuid(),
  createdAt: z.string().datetime(),
})
export type Notification = z.infer<typeof NotificationSchema>

/* ── Input schemas ───────────────────────────────────────────────────── */

export const MarkNotificationsReadSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, 'At least one notification ID required'),
})
export type MarkNotificationsRead = z.infer<typeof MarkNotificationsReadSchema>

export const SendNotificationSchema = z.object({
  userId: z.string().cuid(),
  type:   NotificationType,
  title:  z.string().min(1).max(100),
  body:   z.string().min(1).max(500),
  data:   z.record(z.unknown()).optional(),
})
export type SendNotification = z.infer<typeof SendNotificationSchema>

/* ── Query ───────────────────────────────────────────────────────────── */

export const NotificationQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type:   NotificationType.optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(50).default(20),
})
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>
