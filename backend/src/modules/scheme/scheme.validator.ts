import { z } from 'zod';

export const checkEligibilitySchema = z.object({
  age: z.number().int().min(0, 'Age must be non-negative').max(120, 'Age must be at most 120'),
  annualIncome: z.number().min(0, 'Income must be non-negative').optional(),
  landholdingAcres: z.number().min(0, 'Landholding must be non-negative').optional(),
  hasBplCard: z.boolean().optional(),
  hasLandRecord: z.boolean().optional(),
  casteCategory: z.enum(['SC', 'ST', 'OBC', 'GENERAL']).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'TRANSGENDER', 'OTHER', 'ANY']).optional(),
});

export const createSchemeApplicationSchema = z.object({
  applicantData: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
    message: 'applicantData must contain at least one field',
  }),
  uploadedDocumentRefs: z
    .array(
      z.object({
        code: z.string().min(1, 'Document code is required'),
        url: z.string().url('Document URL must be valid'),
        fileName: z.string().min(1, 'File name is required'),
      })
    )
    .optional()
    .default([]),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
});

export const updateSchemeApplicationStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'SUBMITTED',
    'VERIFIED_BY_PANCHAYAT',
    'FORWARDED_TO_BLOCK',
    'SANCTIONED',
    'REJECTED',
  ]),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
});
