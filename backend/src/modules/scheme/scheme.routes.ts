import { Router } from 'express';
import { schemeController } from './scheme.controller';
import { authenticate } from '@core/middleware/auth.middleware';
import { authorize } from '@core/middleware/rbac.middleware';

const router = Router();

// Public / Citizen Advisory Scheme Catalog Endpoints
router.get('/', schemeController.listSchemes);
router.get('/applications/my', authenticate, authorize(['CITIZEN', 'ASSISTED_OPERATOR']), schemeController.getMyApplications);
router.get('/:id', schemeController.getSchemeById);
router.post('/:id/check-eligibility', schemeController.checkEligibility);

// Protected Citizen Application Endpoints
router.post('/:id/apply', authenticate, authorize(['CITIZEN', 'ASSISTED_OPERATOR']), schemeController.applyForScheme);

// Protected Official Application Status Management
router.patch(
  '/applications/:id/status',
  authenticate,
  authorize(['SARPANCH', 'PANCHAYAT_SECRETARY', 'WARD_MEMBER', 'BLOCK_OFFICER', 'SYSTEM_ADMIN']),
  schemeController.updateStatus
);

export const schemeRoutes = router;
