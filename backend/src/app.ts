import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from '@core/middleware/audit.middleware';
import { tenantMiddleware } from '@core/middleware/tenant.middleware';
import { errorHandler } from '@core/middleware/error.middleware';
import { checkDatabaseHealth } from '@core/database/connection';
import { NotFoundError } from '@core/errors/app-error';
import { grievanceRoutes } from './modules/grievance/grievance.routes';
import { infrastructureRoutes } from './modules/infrastructure/infrastructure.routes';
import { registerGrievanceSubscribers } from './modules/grievance/grievance.subscriber';
import { developmentRoutes } from './modules/development/development.routes';
import { verificationRoutes } from './modules/verification/verification.routes';
import { registerDevelopmentSubscribers } from './modules/development/development.subscriber';
import { authRoutes } from './modules/auth/auth.routes';
import { schemeRoutes } from './modules/scheme/scheme.routes';
import { assistedAccessRoutes } from './modules/assisted-access/assisted-access.routes';

// Register cross-module domain event subscribers
registerGrievanceSubscribers();
registerDevelopmentSubscribers();

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // Health checks
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    });
  });

  app.get('/health/db', async (req: Request, res: Response) => {
    const isDbHealthy = await checkDatabaseHealth();
    if (isDbHealthy) {
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Multi-tenant context
  app.use(tenantMiddleware);

  app.get('/api/v1/tenant-echo', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        panchayatId: req.headers['x-panchayat-id'],
        message: 'Tenant context active and validated.',
      },
    });
  });

  // Feature routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/schemes', schemeRoutes);
  app.use('/api/v1/assisted', assistedAccessRoutes);
  app.use('/api/v1/grievances', grievanceRoutes);
  app.use('/api/v1/infrastructure', infrastructureRoutes);
  app.use('/api/v1/projects', developmentRoutes);
  app.use('/api/v1/verification', verificationRoutes);

  app.use((req: Request, res: Response, next) => {
    next(new NotFoundError(`Route '${req.method} ${req.path}' not found.`));
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
