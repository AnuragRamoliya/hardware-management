import http from 'http';
import { env } from './Config/env';
import { logger } from './Config/logger';
import { sequelize } from './Database/Schema';
import { registerJobs } from './Jobs';
import { createApp } from './Config/app';
import { realtimeGateway } from './Realtime/gateway';
import { exportWorker } from './Reports/export_worker';

async function startServer(): Promise<void> {
  process.env.TZ = env.TZ;
  await sequelize.authenticate();
  registerJobs();
  const app = createApp();
  const httpServer = http.createServer(app);
  realtimeGateway.init(httpServer);
  httpServer.listen(env.PORT, () => {
    logger.info(`ITAM API listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Draining HTTP server and terminating gracefully...`);
    exportWorker.stop();
    httpServer.close(async () => {
      logger.info('HTTP server closed. Closing database connections...');
      await sequelize.close();
      logger.info('Graceful shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void startServer().catch((error: unknown) => {
  logger.error(
    'Failed to start ITAM API',
    error instanceof Error ? { message: error.message, stack: error.stack } : { error },
  );
  process.exitCode = 1;
});
