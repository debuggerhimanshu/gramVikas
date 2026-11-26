import { Router } from 'express';
import { assistedAccessController } from './assisted-access.controller';
import { authenticate } from '@core/middleware/auth.middleware';
import { authorize } from '@core/middleware/rbac.middleware';

const router = Router();

// Public Offline Tracking Receipt Lookup (accessible by paper receipt token without login)
router.get('/track/:token', assistedAccessController.trackByToken);

// Operator-assisted scheme application submission
router.post(
  '/schemes/:id/apply',
  authenticate,
  authorize(['ASSISTED_OPERATOR', 'PANCHAYAT_SECRETARY', 'SYSTEM_ADMIN']),
  assistedAccessController.applyAssistedScheme
);

// Operator / Official audit log retrieval
router.get(
  '/logs',
  authenticate,
  authorize([
    'ASSISTED_OPERATOR',
    'PANCHAYAT_SECRETARY',
    'SARPANCH',
    'BLOCK_OFFICER',
    'SYSTEM_ADMIN',
  ]),
  assistedAccessController.getLogs
);

export const assistedAccessRoutes = router;
