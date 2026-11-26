import { z } from 'zod';
import { GrievancePriority, GrievanceCategory } from './grievance.types';

const CATEGORIES = [
  'DRINKING_WATER',
  'SANITATION_WASTE',
  'ROADS_DRAINAGE',
  'STREETLIGHT_ELECTRIC',
  'PUBLIC_HEALTH',
  'ADMIN_CERTIFICATE',
  'OTHER',
] as const;

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const;

const STATUSES = [
  'SUBMITTED',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CITIZEN_VERIFIED',
  'REOPENED',
] as const;

export const createGrievanceSchema = z.object({
  wardId: z.string().uuid('wardId must be a valid UUID'),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(', ')}` }),
  }),
  subCategory: z.string().max(100).optional(),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  geoLatitude: z.number().min(-90).max(90).optional(),
  geoLongitude: z.number().min(-180).max(180).optional(),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  isAssisted: z.boolean().default(false),
  proxyOperatorId: z.string().uuid().optional(),
  complainantUserId: z.string().uuid().optional(),
});

export const updateGrievanceStatusSchema = z.object({
  status: z.enum(STATUSES),
  assignedToUserId: z.string().uuid().optional(),
  resolutionSummary: z.string().min(5).optional(),
  resolutionPhotoUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export const verifyGrievanceSchema = z.object({
  decision: z.enum(['ACCEPT', 'REOPEN']),
  rating: z.number().int().min(1).max(5).optional(),
  rejectionReason: z.string().min(5).optional(),
}).refine(
  (data) => {
    if (data.decision === 'REOPEN' && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  {
    message: "rejectionReason is mandatory when decision is 'REOPEN'",
    path: ['rejectionReason'],
  }
);

export const grievanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  wardId: z.string().uuid().optional(),
  priority: z.enum(PRIORITIES).optional(),
  complainantUserId: z.string().uuid().optional(),
});

/**
 * Calculates standard SLA deadline based on grievance priority and category.
 */
export const calculateSlaDeadline = (
  priority: GrievancePriority = 'MEDIUM',
  category?: GrievanceCategory
): Date => {
  const now = new Date();

  // Emergency situations: 24h
  if (priority === 'EMERGENCY') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // High priority drinking water leaks or power faults: 48h
  if (priority === 'HIGH' && (category === 'DRINKING_WATER' || category === 'STREETLIGHT_ELECTRIC')) {
    return new Date(now.getTime() + 48 * 60 * 60 * 1000);
  }

  if (priority === 'HIGH') {
    return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  }

  if (priority === 'MEDIUM') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  // LOW priority: 14 days
  return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
};
