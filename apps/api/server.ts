import { env } from './Config/env';
import { logger } from './Config/logger';
import { sequelize } from './Database/Schema';
import { registerJobs } from './Jobs';
import { createApp } from './Config/app';

async function startServer(): Promise<void> {
  process.env.TZ = env.TZ;
  await sequelize.authenticate();
  registerJobs();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`ITAM API listening on port ${env.PORT}`);
  });
}

void startServer().catch((error: unknown) => {
  logger.error(
    'Failed to start ITAM API',
    error instanceof Error ? { message: error.message, stack: error.stack } : { error },
  );
  process.exitCode = 1;
});
