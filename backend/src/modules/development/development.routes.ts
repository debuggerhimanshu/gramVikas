import { Router } from 'express';
import { developmentController } from './development.controller';
import { authenticate } from '@core/middleware/auth.middleware';
import { authorize } from '@core/middleware/rbac.middleware';

const router = Router();

// Public / Citizen / Staff: List projects
router.get(
  '/',
  developmentController.listProjects
);

// Public / Transparency Wall: Get expenditure summary
router.get(
  '/summary/expenditure',
  developmentController.getExpenditureSummary
);

// Public / All Roles: Get project details
router.get(
  '/:id',
  developmentController.getProjectById
);

// Sanction project: Panchayat Secretary or Sarpanch
router.post(
  '/',
  authenticate,
  authorize(['PANCHAYAT_SECRETARY', 'SARPANCH', 'SYSTEM_ADMIN']),
  developmentController.createProject
);

// Add milestone: Panchayat Secretary or Sarpanch
router.post(
  '/:id/milestones',
  authenticate,
  authorize(['PANCHAYAT_SECRETARY', 'SARPANCH', 'SYSTEM_ADMIN']),
  developmentController.addMilestone
);

// Record dual-signed voucher: Panchayat Secretary (with Sarpanch co-signatory in payload)
router.post(
  '/:id/vouchers',
  authenticate,
  authorize(['PANCHAYAT_SECRETARY', 'SARPANCH', 'SYSTEM_ADMIN']),
  developmentController.recordVoucher
);

export const developmentRoutes = router;
