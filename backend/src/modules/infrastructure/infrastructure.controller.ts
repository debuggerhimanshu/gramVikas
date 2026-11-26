import { Request, Response, NextFunction } from 'express';
import { infrastructureService, InfrastructureService } from './infrastructure.service';
import {
  createAssetSchema,
  reportAssetFaultSchema,
  assetQuerySchema,
} from './infrastructure.validator';

export class InfrastructureController {
  constructor(private service: InfrastructureService = infrastructureService) {}

  createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedBody = createAssetSchema.parse(req.body);
      const asset = await this.service.createAsset(validatedBody);
      res.status(201).json({
        success: true,
        data: asset,
        message: 'Infrastructure asset registered successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  listAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queryParams = assetQuerySchema.parse(req.query);
      const result = await this.service.listAssets(queryParams);
      res.status(200).json({
        success: true,
        data: result.assets,
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

  getAssetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getAssetById(id);
      res.status(200).json({
        success: true,
        data: result.asset,
        maintenanceHistory: result.maintenanceHistory,
      });
    } catch (err) {
      next(err);
    }
  };

  reportFault = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedBody = reportAssetFaultSchema.parse(req.body);
      const result = await this.service.reportFault(id, validatedBody);
      res.status(201).json({
        success: true,
        data: {
          asset: result.asset,
          maintenanceEvent: result.maintenanceEvent,
        },
        message: 'Asset fault reported successfully. Maintenance ticket auto-spawned in Grievance Queue.',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const infrastructureController = new InfrastructureController();
