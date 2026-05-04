import type { PrismaClient } from '@prisma/client'
import type { DoctorAvailability, Appointment, TimeSlot } from '@pharmabridge/types'

const DAY_NAMES: Record<number, DoctorAvailability['dayOfWeek']> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = (totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Generates all time slots for a doctor on a given date.
 * Pure function — caller is responsible for fetching availability and bookings.
 *
 * Past slots for today are marked isAvailable=false.
 * A slot is unavailable if existing bookings for that startTime >= maxSlots.
 */
export function generateSlots(
  date: Date,
  availability: DoctorAvailability[],
  existingBookings: Appointment[],
): TimeSlot[] {
  const dayName = DAY_NAMES[date.getDay()]
  const avail = availability.find((a) => a.dayOfWeek === dayName && a.isActive)
  if (!avail) return []

  const startMin = parseMinutes(avail.startTime)
  const endMin   = parseMinutes(avail.endTime)

  // Count bookings per slot start time
  const bookedCount = new Map<string, number>()
  for (const booking of existingBookings) {
    if (['PENDING', 'CONFIRMED'].includes(booking.status)) {
      bookedCount.set(booking.startTime, (bookedCount.get(booking.startTime) ?? 0) + 1)
    }
  }

  // For today, filter out slots that have already passed (add 5-min buffer)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth() &&
    date.getDate()     === now.getDate()
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + 5

  const slots: TimeSlot[] = []
  let cursor = startMin

  while (cursor + avail.slotMins <= endMin) {
    const slotStart = formatTime(cursor)
    const slotEnd   = formatTime(cursor + avail.slotMins)
    const bookings  = bookedCount.get(slotStart) ?? 0
    const isPast    = isToday && cursor < nowMinutes

    slots.push({
      startTime:   slotStart,
      endTime:     slotEnd,
      isAvailable: !isPast && bookings < avail.maxSlots,
    })

    cursor += avail.slotMins
  }

  return slots
}

/**
 * DB-backed wrapper: fetches availability + bookings, then calls generateSlots.
 * Only PENDING/CONFIRMED bookings count toward slot capacity.
 */
export async function generateAvailableSlots(
  doctorId: string,
  date: Date,
  prisma: PrismaClient,
): Promise<TimeSlot[]> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const [availability, bookings] = await Promise.all([
    prisma.doctorAvailability.findMany({ where: { doctorId, isActive: true } }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: start, lte: end },
        status: { in: ['PENDING', 'CONFIRMED'] },
        isActive: true,
      },
    }),
  ])

  return generateSlots(
    date,
    availability as unknown as DoctorAvailability[],
    bookings    as unknown as Appointment[],
  )
}

/** Returns true if cancellation is still allowed (>2h before appointment start). */
export function canCancelAppointment(appointmentDate: Date, startTime: string): boolean {
  const [h, m] = startTime.split(':').map(Number)
  const apptStart = new Date(appointmentDate)
  apptStart.setHours(h, m, 0, 0)
  const twoHoursMs = 2 * 60 * 60 * 1000
  return apptStart.getTime() - Date.now() > twoHoursMs
}
