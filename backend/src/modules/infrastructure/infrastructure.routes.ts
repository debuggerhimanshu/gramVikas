import { Router } from 'express';
import { infrastructureController } from './infrastructure.controller';
import { authenticate } from '@core/middleware/auth.middleware';
import { authorize } from '@core/middleware/rbac.middleware';

const router = Router();

// List assets (Public or authenticated)
router.get(
  '/assets',
  infrastructureController.listAssets
);

// Get single asset profile & maintenance history
router.get(
  '/assets/:id',
  infrastructureController.getAssetById
);

// Register asset: Staff only
router.post(
  '/assets',
  authenticate,
  authorize(['PANCHAYAT_SECRETARY', 'SARPANCH', 'SYSTEM_ADMIN']),
  infrastructureController.createAsset
);

// Report asset fault/breakdown: Citizens, Ward Members, Staff
router.post(
  '/assets/:id/faults',
  authenticate,
  authorize(['CITIZEN', 'WARD_MEMBER', 'PANCHAYAT_SECRETARY', 'SARPANCH', 'SYSTEM_ADMIN']),
  infrastructureController.reportFault
);

export const infrastructureRoutes = router;
