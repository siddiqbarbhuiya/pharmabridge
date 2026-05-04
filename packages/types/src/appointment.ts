import { z } from 'zod'
import { ConsultationType, DoctorSummarySchema } from './doctor'
import { PaymentMethod, PaymentStatus } from './order'

/* ── Enum ────────────────────────────────────────────────────────────── */

export const AppointmentStatus = z.enum([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
])
export type AppointmentStatus = z.infer<typeof AppointmentStatus>

export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW:   [],
}

/* ── Full appointment record (API read) ───────────────────────────────── */

export const AppointmentSchema = z.object({
  id:               z.string().cuid(),
  appointmentDate:  z.string().datetime(),
  startTime:        z.string(),
  endTime:          z.string(),
  status:           AppointmentStatus,
  consultationType: ConsultationType,
  symptoms:         z.string().nullable(),
  notes:            z.string().nullable(),
  prescriptionUrl:  z.string().url().nullable(),
  fee:              z.number(),
  paymentStatus:    PaymentStatus,
  razorpayOrderId:  z.string().nullable(),
  razorpayPaymentId: z.string().nullable(),
  customerId:       z.string().cuid(),
  doctorId:         z.string().cuid(),
  isActive:         z.boolean(),
  createdAt:        z.string().datetime(),
  updatedAt:        z.string().datetime(),
})
export type Appointment = z.infer<typeof AppointmentSchema>

/** Detail view: includes nested doctor summary and customer snippet */
export const AppointmentWithDetailsSchema = AppointmentSchema.extend({
  doctor: DoctorSummarySchema,
  customer: z.object({
    id:    z.string().cuid(),
    name:  z.string().nullable(),
    phone: z.string(),
  }),
})
export type AppointmentWithDetails = z.infer<typeof AppointmentWithDetailsSchema>

/* ── Book appointment (POST /customer/appointments) ──────────────────── */

export const BookAppointmentSchema = z.object({
  doctorId:         z.string().cuid(),
  appointmentDate:  z.string().date(),        // YYYY-MM-DD — server resolves to DateTime
  startTime:        z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  consultationType: ConsultationType,
  symptoms:         z.string().max(1000).optional(),
  paymentMethod:    PaymentMethod,
})
export type BookAppointment = z.infer<typeof BookAppointmentSchema>

/* ── Doctor: update appointment status ────────────────────────────────── */

export const UpdateAppointmentStatusSchema = z.object({
  status: AppointmentStatus,
  note:   z.string().max(500).optional(),
})
export type UpdateAppointmentStatus = z.infer<typeof UpdateAppointmentStatusSchema>

/** Doctor fills in notes + optional prescription after the consultation */
export const AddDoctorNotesSchema = z.object({
  notes:           z.string().min(1).max(2000),
  prescriptionUrl: z.string().url().optional(),
})
export type AddDoctorNotes = z.infer<typeof AddDoctorNotesSchema>

/* ── Query schemas ────────────────────────────────────────────────────── */

export const AppointmentQuerySchema = z.object({
  status:          AppointmentStatus.optional(),
  doctorId:        z.string().cuid().optional(),
  customerId:      z.string().cuid().optional(),
  consultationType: ConsultationType.optional(),
  from:            z.string().date().optional(),
  to:              z.string().date().optional(),
  page:            z.coerce.number().int().positive().default(1),
  limit:           z.coerce.number().int().positive().max(100).default(20),
  sortOrder:       z.enum(['asc', 'desc']).default('desc'),
})
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>
