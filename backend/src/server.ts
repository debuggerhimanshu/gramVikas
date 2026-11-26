import { app } from './app';
import { env } from '@config/env';
import { logger } from '@core/utils/logger';
import { closePool } from '@core/database/connection';

const server = app.listen(env.PORT, () => {
  logger.info(`Gram Vikas Backend Modular Monolith running on port ${env.PORT} in '${env.NODE_ENV}' mode`);
  logger.info(`Health check available at http://localhost:${env.PORT}/health`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await closePool();
      logger.info('Graceful shutdown completed successfully. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database pool shutdown', { error: (err as Error).message });
      process.exit(1);
    }
  });

  // Force exit if graceful shutdown takes more than 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded (10s). Forcing termination.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
