import { Request, Response, NextFunction } from 'express';
import { grievanceService, GrievanceService } from './grievance.service';
import {
  createGrievanceSchema,
  updateGrievanceStatusSchema,
  verifyGrievanceSchema,
  grievanceQuerySchema,
} from './grievance.validator';

export class GrievanceController {
  constructor(private service: GrievanceService = grievanceService) {}

  createGrievance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = createGrievanceSchema.parse(req.body);
      const ticket = await this.service.createGrievance(validatedBody);
      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Grievance lodged successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  listGrievances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryParams = grievanceQuerySchema.parse(req.query);
      const result = await this.service.listGrievances(queryParams);
      res.status(200).json({
        success: true,
        data: result.tickets,
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

  getGrievanceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getGrievanceById(id);
      res.status(200).json({
        success: true,
        data: result.ticket,
        timeline: result.timeline,
      });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedBody = updateGrievanceStatusSchema.parse(req.body);
      const updated = await this.service.updateStatus(id, validatedBody);
      res.status(200).json({
        success: true,
        data: updated,
        message: `Grievance status successfully updated to '${updated.status}'.`,
      });
    } catch (err) {
      next(err);
    }
  };

  verifyGrievance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedBody = verifyGrievanceSchema.parse(req.body);
      const updated = await this.service.verifyGrievance(id, validatedBody);
      res.status(200).json({
        success: true,
        data: updated,
        message:
          validatedBody.decision === 'ACCEPT'
            ? 'Grievance resolution verified and closed by citizen.'
            : 'Grievance reopened with citizen dispute note.',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const grievanceController = new GrievanceController();
