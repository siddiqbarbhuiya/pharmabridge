import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { config } from '../config'
import type { NotificationType } from '@pharmabridge/types'
import { initFirebase, getMessaging } from '../utils/firebase'

// BullMQ requires maxRetriesPerRequest: null on the ioredis connection
const queueConnection  = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })
const workerConnection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })

export interface PushNotificationJobData {
  userId:  string
  title:   string
  body:    string
  type:    NotificationType
  data?:   Record<string, string>
}

export const notificationQueue = new Queue<PushNotificationJobData>('notifications', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts:    3,
    backoff:     { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail:     50,
  },
})

// ── Worker ───────────────────────────────────────────────────────────────
// Runs in the same process; uses its own Prisma instance (workers can't
// share the Fastify-scoped prisma client).
const prisma = new PrismaClient()
initFirebase()

export const notificationWorker = new Worker<PushNotificationJobData>(
  'notifications',
  async (job) => {
    const { userId, title, body, type, data } = job.data

    // Always save to DB
    await prisma.notification.create({
      data: { userId, title, body, type, ...(data !== undefined && { data }) },
    })

    // Attempt FCM push
    const messaging = getMessaging()
    if (messaging) {
      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { fcmToken: true },
      })
      if (user?.fcmToken) {
        try {
          await messaging.send({
            token:        user.fcmToken,
            notification: { title, body },
            ...(data && { data }),
          })
        } catch {
          // Stale token — log but don't fail the job (DB row was already saved)
        }
      }
    }
  },
  {
    connection: workerConnection,
    concurrency: 5,
  },
)

notificationWorker.on('failed', (job, err) => {
  console.error(`[notification-worker] job ${job?.id} failed:`, err.message)
})
