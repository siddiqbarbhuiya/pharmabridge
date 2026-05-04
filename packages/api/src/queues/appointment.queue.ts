import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { config } from '../config'
import { notificationQueue } from './notification.queue'

const queueConnection  = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })
const workerConnection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })

export interface AppointmentReminderJobData {
  userId:            string
  appointmentId:     string
  appointmentNumber: string
  doctorName:        string
  startTime:         string
  dateStr:           string
}

export const appointmentQueue = new Queue<AppointmentReminderJobData>('appointment-reminders', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts:         2,
    removeOnComplete: 50,
    removeOnFail:     50,
  },
})

/**
 * Schedule a push reminder for 1 hour before the appointment.
 * Safe to call at booking time — skips scheduling if the window has already passed.
 */
export async function scheduleAppointmentReminder(params: {
  userId:            string
  appointmentId:     string
  appointmentNumber: string
  doctorName:        string
  appointmentDate:   Date
  startTime:         string
}): Promise<void> {
  const { appointmentDate, startTime, ...rest } = params

  const [h, m]       = startTime.split(':').map(Number)
  const apptDateTime = new Date(appointmentDate)
  apptDateTime.setHours(h, m, 0, 0)

  const reminderAt = new Date(apptDateTime.getTime() - 60 * 60 * 1000) // 1 hour before
  const delay      = reminderAt.getTime() - Date.now()
  if (delay <= 0) return // too close or already past

  const dateStr = appointmentDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  await appointmentQueue.add(
    'appointment-reminder',
    { ...rest, startTime, dateStr },
    { delay, jobId: `reminder:${params.appointmentId}` }, // idempotent jobId
  )
}

// ── Worker ───────────────────────────────────────────────────────────────
// When the reminder fires, enqueue a push notification via the notification queue.
export const appointmentReminderWorker = new Worker<AppointmentReminderJobData>(
  'appointment-reminders',
  async (job) => {
    const { userId, doctorName, startTime, dateStr, appointmentId, appointmentNumber } = job.data

    await notificationQueue.add('appointment-reminder', {
      userId,
      title: 'Appointment Reminder',
      body:  `Your appointment with Dr. ${doctorName} is in 1 hour — ${startTime} on ${dateStr}.`,
      type:  'APPOINTMENT_UPDATE',
      data:  { appointmentId, appointmentNumber },
    })
  },
  {
    connection: workerConnection,
    concurrency: 10,
  },
)

appointmentReminderWorker.on('failed', (job, err) => {
  console.error(`[appointment-reminder-worker] job ${job?.id} failed:`, err.message)
})
