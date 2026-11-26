import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const applyAssistedSchemeSchema = z.object({
  citizenName: z.string().min(2, 'Citizen name must be at least 2 characters').max(150),
  citizenPhone: z.string().regex(phoneRegex, 'Citizen phone must be a valid 10-digit Indian mobile number'),
  citizenUserId: z.string().regex(uuidRegex, 'Invalid citizenUserId UUID').optional(),
  consentType: z.enum(['PHYSICAL_FORM_SIGNATURE', 'OTP_VERIFIED', 'VERBAL_WITH_WITNESS']),
  consentProofUrl: z.string().url('Consent proof URL must be valid').optional(),
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
