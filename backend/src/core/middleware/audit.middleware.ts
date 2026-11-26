import { Request, Response, NextFunction } from 'express';
import { logger } from '@core/utils/logger';
import { RequestContextManager } from '@core/context/request-context';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const context = RequestContextManager.getContext();

    logger.info(`${method} ${originalUrl} [${statusCode}] - ${duration}ms`, {
      ip,
      correlationId: context?.correlationId,
      panchayatId: context?.panchayatId,
      userId: context?.user?.id,
    });
  });

  next();
};

export interface AuditRecord {
  actorId?: string;
  actorRole?: string;
  panchayatId?: string;
  action: string;
  entityType: string;
  entityId: string;
  delta?: Record<string, unknown>;
}

export const auditLogHelper = async (record: AuditRecord): Promise<void> => {
  const context = RequestContextManager.getContext();
  logger.info(`[AUDIT] Action: ${record.action} on ${record.entityType}:${record.entityId}`, {
    actorId: record.actorId || context?.user?.id,
    actorRole: record.actorRole || context?.user?.role,
    panchayatId: record.panchayatId || context?.panchayatId,
    delta: record.delta,
    timestamp: new Date().toISOString(),
  });
};
