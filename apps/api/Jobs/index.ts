import cron from 'node-cron';
import { logger } from '../Config/logger';
import { runExpiryAlerts, runCredentialVaultJobs } from '../Services/notification';

export function registerJobs(): void {
  cron.schedule('0 0 * * *', () => {
    void runExpiryAlerts()
      .then((count) => logger.info(`Expiry alerts processed: ${count}`))
      .catch((error: unknown) => logger.error('Expiry alerts job failed', { error }));

    void runCredentialVaultJobs()
      .then((res) => logger.info(`Credential vault jobs processed: ${JSON.stringify(res)}`))
      .catch((error: unknown) => logger.error('Credential vault jobs failed', { error }));
  });
}
