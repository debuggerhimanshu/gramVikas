import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

router.post('/register-panchayat', authController.registerPanchayat);
router.post('/register-citizen', authController.registerCitizen);
router.post('/login', authController.login);

export const authRoutes = router;
