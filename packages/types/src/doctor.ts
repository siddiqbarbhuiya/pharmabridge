import { z } from 'zod'

/* ── Enums ───────────────────────────────────────────────────────────── */

export const DoctorSpecialty = z.enum([
  'GENERAL_PHYSICIAN',
  'CARDIOLOGIST',
  'DERMATOLOGIST',
  'ENDOCRINOLOGIST',
  'GASTROENTEROLOGIST',
  'NEUROLOGIST',
  'ONCOLOGIST',
  'OPHTHALMOLOGIST',
  'ORTHOPEDIST',
  'PEDIATRICIAN',
  'PSYCHIATRIST',
  'PULMONOLOGIST',
  'UROLOGIST',
  'OTHER',
])
export type DoctorSpecialty = z.infer<typeof DoctorSpecialty>

export const DayOfWeek = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
])
export type DayOfWeek = z.infer<typeof DayOfWeek>

/** How the patient attends the appointment */
export const ConsultationType = z.enum(['IN_PERSON', 'VIDEO', 'CHAT'])
export type ConsultationType = z.infer<typeof ConsultationType>

/* ── Time string helper ──────────────────────────────────────────────── */

const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')

/* ── Doctor record ───────────────────────────────────────────────────── */

export const DoctorSchema = z.object({
  id:              z.string().cuid(),
  name:            z.string(),
  registrationNo:  z.string(),
  specialty:       DoctorSpecialty,
  qualifications:  z.string(),
  experience:      z.number().int().nonnegative(),
  consultationFee: z.number().positive(),
  bio:             z.string().nullable(),
  imageUrl:        z.string().url().nullable(),
  languages:       z.array(z.string()),
  isActive:        z.boolean(),
  isVerified:      z.boolean(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
})
export type Doctor = z.infer<typeof DoctorSchema>

/** Lightweight projection used in search results and appointment cards */
export const DoctorSummarySchema = DoctorSchema.pick({
  id:              true,
  name:            true,
  specialty:       true,
  qualifications:  true,
  experience:      true,
  consultationFee: true,
  imageUrl:        true,
  languages:       true,
  isVerified:      true,
})
export type DoctorSummary = z.infer<typeof DoctorSummarySchema>

/* ── Doctor write schemas ─────────────────────────────────────────────── */

export const CreateDoctorSchema = z.object({
  name:            z.string().min(2).max(200),
  registrationNo:  z.string().min(1).max(50),
  specialty:       DoctorSpecialty,
  qualifications:  z.string().min(2).max(500),
  experience:      z.number().int().nonnegative().max(80),
  consultationFee: z.number().positive().max(10_000),
  bio:             z.string().max(1000).optional(),
  imageUrl:        z.string().url().optional(),
  languages:       z.array(z.string().min(1)).min(1, 'At least one language required'),
})
export type CreateDoctor = z.infer<typeof CreateDoctorSchema>

export const UpdateDoctorSchema = CreateDoctorSchema.partial()
export type UpdateDoctor = z.infer<typeof UpdateDoctorSchema>

/* ── DoctorAvailability record ────────────────────────────────────────── */

export const DoctorAvailabilitySchema = z.object({
  id:        z.string().cuid(),
  dayOfWeek: DayOfWeek,
  startTime: TimeString,
  endTime:   TimeString,
  slotMins:  z.number().int().positive(),
  maxSlots:  z.number().int().positive(),
  isActive:  z.boolean(),
  doctorId:  z.string().cuid(),
})
export type DoctorAvailability = z.infer<typeof DoctorAvailabilitySchema>

const AvailabilitySlotSchema = z.object({
  dayOfWeek: DayOfWeek,
  startTime: TimeString,
  endTime:   TimeString,
  slotMins:  z.number().int().min(5).max(120).default(15),
  maxSlots:  z.number().int().positive().max(100),
}).refine(
  (d) => d.startTime < d.endTime,
  { message: 'startTime must be before endTime', path: ['endTime'] },
)

/** Replaces all availability for a doctor in a single PUT */
export const SetDoctorAvailabilitySchema = z.object({
  schedules: z.array(AvailabilitySlotSchema).min(1),
})
export type SetDoctorAvailability = z.infer<typeof SetDoctorAvailabilitySchema>

/* ── Query: available time slots on a given date ─────────────────────── */

export const AvailableSlotsQuerySchema = z.object({
  doctorId:        z.string().cuid(),
  date:            z.string().date(),           // YYYY-MM-DD
  consultationType: ConsultationType.optional(),
})
export type AvailableSlotsQuery = z.infer<typeof AvailableSlotsQuerySchema>

export const TimeSlotSchema = z.object({
  startTime:   TimeString,
  endTime:     TimeString,
  isAvailable: z.boolean(),
})
export type TimeSlot = z.infer<typeof TimeSlotSchema>

/* ── Doctor list / search query ───────────────────────────────────────── */

export const DoctorQuerySchema = z.object({
  specialty:       DoctorSpecialty.optional(),
  consultationType: ConsultationType.optional(),
  search:          z.string().optional(),
  isVerified:      z.coerce.boolean().optional(),
  minFee:          z.coerce.number().positive().optional(),
  maxFee:          z.coerce.number().positive().optional(),
  language:        z.string().optional(),
  page:            z.coerce.number().int().positive().default(1),
  limit:           z.coerce.number().int().positive().max(50).default(20),
  sortBy:          z.enum(['consultationFee', 'experience', 'createdAt']).default('createdAt'),
  sortOrder:       z.enum(['asc', 'desc']).default('asc'),
})
export type DoctorQuery = z.infer<typeof DoctorQuerySchema>
