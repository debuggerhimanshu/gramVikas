import { Router } from 'express';
import { verificationController } from './verification.controller';
import { authenticate } from '@core/middleware/auth.middleware';
import { authorize } from '@core/middleware/rbac.middleware';

const router = Router();

// Submit on-ground verification: Citizens, Ward Members, Block Officers, Admins
router.post(
  '/submit',
  authenticate,
  authorize(['CITIZEN', 'WARD_MEMBER', 'BLOCK_OFFICER', 'SYSTEM_ADMIN']),
  verificationController.submitVerification
);

// Get all verifications and audit variance flags for a project (Public/Auditors)
router.get(
  '/project/:projectId',
  verificationController.listVerificationsByProject
);

export const verificationRoutes = router;
