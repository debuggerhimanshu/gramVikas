import { Request, Response, NextFunction } from 'express';
import { developmentService, DevelopmentService } from './development.service';
import {
  createProjectSchema,
  createMilestoneSchema,
  createVoucherSchema,
  projectQuerySchema,
} from './development.validator';

export class DevelopmentController {
  constructor(private service: DevelopmentService = developmentService) {}

  createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = createProjectSchema.parse(req.body);
      const project = await this.service.createProject(validatedBody);
      res.status(201).json({
        success: true,
        data: project,
        message: 'Development project sanctioned and created successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  listProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryParams = projectQuerySchema.parse(req.query);
      const result = await this.service.listProjects(queryParams);
      res.status(200).json({
        success: true,
        data: result.projects,
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

  getProjectById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getProjectById(id);
      res.status(200).json({
        success: true,
        data: result.project,
        milestones: result.milestones,
        vouchers: result.vouchers,
      });
    } catch (err) {
      next(err);
    }
  };

  addMilestone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedBody = createMilestoneSchema.parse(req.body);
      const milestone = await this.service.addMilestone(id, validatedBody);
      res.status(201).json({
        success: true,
        data: milestone,
        message: 'Project milestone added successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  recordVoucher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedBody = createVoucherSchema.parse(req.body);
      const voucher = await this.service.recordVoucher(id, validatedBody);
      res.status(201).json({
        success: true,
        data: voucher,
        message: 'Expenditure voucher recorded and dual-signed successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  getExpenditureSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.service.getExpenditureSummary();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const developmentController = new DevelopmentController();
