import { Router } from 'express';
import { grievanceController } from './grievance.controller';
import { authenticate } from '@core/middleware/auth.middleware';
import { authorize } from '@core/middleware/rbac.middleware';

const router = Router();

// Ingestion: Citizen, Assisted Operator, Ward Member, Secretary
router.post(
  '/',
  authenticate,
  authorize(['CITIZEN', 'ASSISTED_OPERATOR', 'WARD_MEMBER', 'PANCHAYAT_SECRETARY']),
  grievanceController.createGrievance
);

// List grievances: Authenticated users (role-scoped in service)
router.get(
  '/',
  authenticate,
  grievanceController.listGrievances
);

// Get single ticket details and timeline
router.get(
  '/:id',
  authenticate,
  grievanceController.getGrievanceById
);

// State transition & Assignment: Staff only
router.patch(
  '/:id/status',
  authenticate,
  authorize(['PANCHAYAT_SECRETARY', 'SARPANCH', 'WARD_MEMBER', 'SYSTEM_ADMIN']),
  grievanceController.updateStatus
);

// Citizen verification loop: Accept resolution or reopen
router.post(
  '/:id/verify',
  authenticate,
  authorize(['CITIZEN', 'ASSISTED_OPERATOR', 'SYSTEM_ADMIN']),
  grievanceController.verifyGrievance
);

export const grievanceRoutes = router;
