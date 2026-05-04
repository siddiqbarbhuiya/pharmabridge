import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import type { Server } from 'socket.io'
import type { NotificationType } from '@pharmabridge/types'
import { initFirebase, getMessaging } from '../utils/firebase'

export interface AppointmentForNotification {
  id:                string
  appointmentNumber: string
  appointmentDate:   Date
  startTime:         string
  customerId:        string
  customer: { name: string | null; fcmToken: string | null }
  doctor:   { name: string; pharmacyId: string }
}

export class NotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly io?: Server,
  ) {
    initFirebase()
  }

  // ── Push notification via FCM ─────────────────────────────────────────
  async sendPush(
    userId:  string,
    title:   string,
    body:    string,
    data?:   Record<string, string>,
  ): Promise<void> {
    const messaging = getMessaging()
    if (!messaging) return

    try {
      const user = await this.prisma.user.findUnique({
        where:  { id: userId },
        select: { fcmToken: true },
      })
      if (!user?.fcmToken) return

      await messaging.send({
        token:        user.fcmToken,
        notification: { title, body },
        ...(data && { data }),
      })
    } catch (err) {
      // Stale tokens are common — log and continue
      console.warn('FCM push failed:', (err as Error).message)
    }
  }

  // ── Persist notification row ──────────────────────────────────────────
  async saveToDB(
    userId: string,
    title:  string,
    body:   string,
    type:   NotificationType,
    data?:  Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId, title, body, type,
        ...(data !== undefined && { data: data as Prisma.InputJsonValue }),
      },
    })
  }

  // ── Socket.io emit ────────────────────────────────────────────────────
  emitSocket(namespace: string, room: string, event: string, payload: unknown): void {
    this.io?.of(namespace).to(room).emit(event, payload)
  }

  // ── Composed: appointment confirmed ──────────────────────────────────
  async sendAppointmentConfirmation(appt: AppointmentForNotification): Promise<void> {
    const dateStr = appt.appointmentDate.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    const title = 'Appointment Confirmed'
    const body  = `Your appointment with Dr. ${appt.doctor.name} is confirmed for ${dateStr} at ${appt.startTime}.`
    const notifData = {
      appointmentId:     appt.id,
      appointmentNumber: appt.appointmentNumber,
    }

    await Promise.all([
      this.sendPush(appt.customerId, title, body, notifData),
      this.saveToDB(appt.customerId, title, body, 'APPOINTMENT_UPDATE', notifData),
    ])

    this.emitSocket('/customer', `user:${appt.customerId}`, 'appointment:confirmed', {
      appointmentId:     appt.id,
      appointmentNumber: appt.appointmentNumber,
      doctorName:        appt.doctor.name,
      time:              appt.startTime,
      date:              dateStr,
    })
  }
}

// ── Fastify plugin ────────────────────────────────────────────────────────
declare module 'fastify' {
  interface FastifyInstance {
    notifications: NotificationService
  }
}

const notificationServicePlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate('notifications', new NotificationService(fastify.prisma, fastify.io))
})

export default notificationServicePlugin
