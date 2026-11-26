import { Request, Response, NextFunction } from 'express';
import {
  assistedAccessService,
  AssistedAccessService,
} from './assisted-access.service';
import { applyAssistedSchemeSchema } from './assisted-access.validator';
import { RequestContextManager } from '@core/context/request-context';

export class AssistedAccessController {
  constructor(private readonly service: AssistedAccessService = assistedAccessService) {}

  applyAssistedScheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user || RequestContextManager.getUser()!;
      const panchayatId = req.headers['x-panchayat-id'] as string;
      const validated = applyAssistedSchemeSchema.parse(req.body);

      const result = await this.service.applySchemeAssisted(
        req.params.id,
        validated,
        user.id,
        panchayatId
      );

      res.status(201).json({
        success: true,
        message: 'Assisted scheme application submitted and paper tracking token generated.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  trackByToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.trackByToken(req.params.token);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user || RequestContextManager.getUser()!;
      const panchayatId = req.headers['x-panchayat-id'] as string;
      const operatorFilter = user.role === 'ASSISTED_OPERATOR' ? user.id : undefined;

      const logs = await this.service.getLogs(panchayatId, operatorFilter);
      res.status(200).json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const assistedAccessController = new AssistedAccessController();
