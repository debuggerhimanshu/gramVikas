import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from './auth.service';
import {
  registerPanchayatSchema,
  registerCitizenSchema,
  loginSchema,
} from './auth.validator';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  registerPanchayat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = registerPanchayatSchema.parse(req.body);
      const result = await this.service.registerPanchayat(validated);
      res.status(201).json({
        success: true,
        message: 'Panchayat and Sarpanch leadership registered successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  registerCitizen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = registerCitizenSchema.parse(req.body);
      const result = await this.service.registerCitizen(validated);
      res.status(201).json({
        success: true,
        message: 'Citizen registered successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await this.service.login(validated);
      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
