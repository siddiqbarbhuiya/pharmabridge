# Doctor Appointment System

## Business Rules
- Appointment booking is FREE for users (no payment)
- Doctors are listed BY pharmacies (pharmacy owns doctor slots)
- Pharmacy registers → admin verifies manually → pharmacy goes LIVE
- Only APPROVED pharmacies can list doctors
- Doctor is not a separate user account — they are a profile under a pharmacy
- Pharmacy staff manages all doctor availability and bookings

## Appointment Status Flow
PENDING → CONFIRMED → COMPLETED
PENDING → CANCELLED (by user or pharmacy)
CONFIRMED → NO_SHOW (by pharmacy if user didn't come)

## Availability Model
- DoctorAvailability: pharmacyId, doctorId, dayOfWeek (0–6), startTime, endTime, slotDurationMinutes
- TimeSlot: generated on-the-fly from availability, NOT stored in DB
- Appointment: stores booked slot (date + startTime + endTime)
- Max slots per day = Math.floor((endTime - startTime) / slotDuration)

## Doctor Profile Fields
- name, specialization, qualification, experience (years)
- consultationFee: 0 (FREE, kept in schema for future monetization)
- photo (Cloudinary)
- bio (short)
- languages spoken
- isActive

## Booking Rules
- User must be logged in
- One booking per user per doctor per day
- Slot must be in the future (no past booking)
- Cancellation allowed up to 2 hours before appointment
- Phone number mandatory (pharmacy will call to confirm)

## Slot Generation Algorithm (src/utils/slots.ts)
```typescript
generateAvailableSlots(doctorId, date, prisma):
  1. Find DoctorAvailability for that dayOfWeek
  2. Get existing Appointments for that doctor + date
  3. Generate all slots (startTime incremented by slotDurationMinutes)
  4. Mark each slot isAvailable = (bookingCount < maxBookingsPerSlot)
  5. Filter out past slots (compare with current time for today's date)
  6. Return: Array<{ startTime: string, endTime: string, isAvailable: boolean }>
```

## Double-Booking Prevention
Use Prisma transaction with a SELECT FOR UPDATE check before inserting Appointment.
Return error code: SLOT_NO_LONGER_AVAILABLE (409)

## Cancellation Window
Check: (appointment.date + appointment.startTime) - now > 2 hours
If not: return error CANCELLATION_WINDOW_EXPIRED (400)

## Appointment Number Format
PB-APT-00001 (padded 5-digit sequence, auto-increment)

## Specializations List (for dropdowns)
General Physician, Cardiologist, Dermatologist, Diabetologist, 
Pediatrician, Gynecologist, Orthopedic, ENT, Ophthalmologist,
Neurologist, Psychiatrist, Dentist, Physiotherapist, Dietitian

## Notification Events
On new booking → notify pharmacy: Socket.io "appointment:new" + push notification
On pharmacy confirm → notify patient: push + SMS (MSG91)
On cancellation → notify the other party: push notification
Reminder: BullMQ job 1 hour before appointment → push to patient
