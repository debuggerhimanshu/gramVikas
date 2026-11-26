import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const leaderDetailsSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(150),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  designation: z.string().max(100).optional().default('Sarpanch'),
});

export const registerPanchayatSchema = z.object({
  districtId: z.string().regex(uuidRegex, 'Invalid districtId UUID'),
  blockId: z.string().regex(uuidRegex, 'Invalid blockId UUID'),
  name: z.string().min(3, 'Panchayat name must be at least 3 characters').max(100),
  lgdCode: z.string().min(3, 'LGD code must be at least 3 characters').max(15),
  code: z.string().max(20).optional(),
  officeAddress: z.string().max(300).optional(),
  leader: leaderDetailsSchema,
});

export const registerCitizenSchema = z.object({
  panchayatId: z.string().regex(uuidRegex, 'Invalid panchayatId UUID'),
  wardId: z.string().regex(uuidRegex, 'Invalid wardId UUID'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(150),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email identifier is required'),
  password: z.string().min(1, 'Password is required'),
});
