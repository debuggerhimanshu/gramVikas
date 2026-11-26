import { z } from 'zod';

const VERIFICATION_SOURCES = [
  'CITIZEN_SOCIAL_AUDIT',
  'WARD_COMMITTEE',
  'TECHNICAL_AUDITOR_BDO',
] as const;

const VERIFICATION_RATINGS = [
  'SATISFACTORY',
  'DEFECTIVE',
  'INCOMPLETE',
  'FRAUD_SUSPECTED',
] as const;

export const submitVerificationSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  milestoneId: z.string().uuid().optional(),
  verificationSource: z.enum(VERIFICATION_SOURCES).default('CITIZEN_SOCIAL_AUDIT'),
  geoLatitude: z.number().min(-90).max(90),
  geoLongitude: z.number().min(-180).max(180),
  distanceFromProjectMeters: z.number().min(0).default(0),
  photoUrls: z.array(z.string().url()).min(1, 'At least one evidence photo URL is required'),
  observations: z.string().min(10, 'Observations must be at least 10 characters').max(1000),
  rating: z.enum(VERIFICATION_RATINGS),
});

export const verificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  varianceOnly: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});
