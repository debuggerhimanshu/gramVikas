import { Request, Response, NextFunction } from 'express';
import { schemeService, SchemeService } from './scheme.service';
import {
  checkEligibilitySchema,
  createSchemeApplicationSchema,
  updateSchemeApplicationStatusSchema,
} from './scheme.validator';
import { RequestContextManager } from '@core/context/request-context';
import { SchemeCategory } from './scheme.types';

export class SchemeController {
  constructor(private readonly service: SchemeService = schemeService) {}

  listSchemes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = req.query.category as SchemeCategory | undefined;
      const schemes = await this.service.listSchemes(category);
      res.status(200).json({
        success: true,
        data: schemes,
        count: schemes.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getSchemeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheme = await this.service.getSchemeById(req.params.id);
      res.status(200).json({
        success: true,
        data: scheme,
      });
    } catch (err) {
      next(err);
    }
  };

  checkEligibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = checkEligibilitySchema.parse(req.body);
      const result = await this.service.checkEligibility(req.params.id, profile);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  applyForScheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user || RequestContextManager.getUser()!;
      const panchayatId = req.headers['x-panchayat-id'] as string;
      const validated = createSchemeApplicationSchema.parse(req.body);

      const application = await this.service.applyForScheme(
        req.params.id,
        validated,
        user.id,
        panchayatId
      );

      res.status(201).json({
        success: true,
        message: 'Scheme application submitted successfully.',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  };

  getMyApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user || RequestContextManager.getUser()!;
      const panchayatId = req.headers['x-panchayat-id'] as string;
      const applications = await this.service.getMyApplications(user.id, panchayatId);

      res.status(200).json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const panchayatId = req.headers['x-panchayat-id'] as string;
      const validated = updateSchemeApplicationStatusSchema.parse(req.body);

      const updated = await this.service.updateApplicationStatus(
        req.params.id,
        panchayatId,
        validated
      );

      res.status(200).json({
        success: true,
        message: `Scheme application status updated to '${updated.status}'.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const schemeController = new SchemeController();
