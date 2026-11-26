import { Request, Response, NextFunction } from 'express';
import { verificationService, VerificationService } from './verification.service';
import {
  submitVerificationSchema,
  verificationQuerySchema,
} from './verification.validator';

export class VerificationController {
  constructor(private service: VerificationService = verificationService) {}

  submitVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = submitVerificationSchema.parse(req.body);
      const verification = await this.service.submitVerification(validatedBody);
      res.status(201).json({
        success: true,
        data: verification,
        message: 'On-ground development verification evidence lodged successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  listVerificationsByProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { projectId } = req.params;
      const queryParams = verificationQuerySchema.parse(req.query);
      const result = await this.service.listVerificationsByProject(projectId, queryParams);
      res.status(200).json({
        success: true,
        data: result.verifications,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const verificationController = new VerificationController();
