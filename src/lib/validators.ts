import { z } from 'zod';
import { userRoles } from '@/lib/roles';
import { rideStatusOrder, paymentStatusValues } from '@/lib/constants';

const coordinate = z.number().finite();
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer');
const nameSchema = z.string().trim().min(2, 'Enter your full name').max(80, 'Full name must be 80 characters or fewer');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(userRoles, {
    message: 'Choose rider or driver'
  }).default('RIDER')
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password')
});

export const rideCreateSchema = z.object({
  originLabel: z.string().min(2).max(120),
  originLatitude: coordinate,
  originLongitude: coordinate,
  destinationLabel: z.string().min(2).max(120),
  destinationLatitude: coordinate,
  destinationLongitude: coordinate,
  distanceKm: z.number().positive().max(500),
  durationMinutes: z.number().positive().max(720),
  surgeMultiplier: z.number().min(1).max(10).optional(),
  tripType: z.enum(['RIDE', 'PACKAGE', 'RENTAL', 'MULTI_PARCEL']).default('RIDE'),
  scheduledAt: z.string().datetime().optional().nullable(),
  bookingForName: z.string().min(2).max(80).optional().nullable(),
  bookingForPhone: z.string().min(5).max(24).optional().nullable(),
  parcelCount: z.coerce.number().int().min(1).max(20).default(1),
  driverId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

export const fareEstimateSchema = z.object({
  distanceKm: z.number().positive().max(500),
  durationMinutes: z.number().positive().max(720),
  surgeMultiplier: z.number().min(1).max(10).optional()
});

export const rideStatusSchema = z.object({
  status: z.enum(rideStatusOrder)
});

export const locationSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  heading: z.number().finite().optional().nullable(),
  speed: z.number().finite().optional().nullable(),
  accuracy: z.number().finite().optional().nullable(),
  rideId: z.string().optional().nullable()
});

export const availabilitySchema = z.object({
  isAvailable: z.boolean()
});

export const accountProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phoneNumber: z.string().min(5).max(24).optional().nullable(),
  preferredLanguage: z.string().min(2).max(12).optional(),
  vehicleMake: z.string().min(1).max(60).optional().nullable(),
  vehicleModel: z.string().min(1).max(60).optional().nullable(),
  vehicleColor: z.string().min(1).max(60).optional().nullable(),
  plateNumber: z.string().min(1).max(20).optional().nullable(),
  serviceRadiusKm: z.coerce.number().int().min(1).max(200).optional(),
  isAvailable: z.boolean().optional()
});

export const paymentIntentTipSchema = z.object({
  tipAmountCents: z.coerce.number().int().min(0).max(20000).optional().default(0)
});

export const directionsSchema = z.object({
  originLatitude: z.coerce.number().finite(),
  originLongitude: z.coerce.number().finite(),
  destinationLatitude: z.coerce.number().finite(),
  destinationLongitude: z.coerce.number().finite()
});

export const webhookQuerySchema = z.object({
  signature: z.string().optional()
});

export const rideEventTypeSchema = z.object({
  type: z.string().min(2).max(60),
  payload: z.record(z.unknown()).optional()
});

export const paymentStatusSchema = z.enum(paymentStatusValues);
