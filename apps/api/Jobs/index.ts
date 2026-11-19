import cron from 'node-cron';
import { logger } from '../Config/logger';
import { runExpiryAlerts, runCredentialVaultJobs } from '../Services/notification';
import { runSlaCheck, runNeedInfoReminders, runAutoCloseFulfilled } from './request_sla';
import {
  runOffboardingReminders,
  runLwdProcessing,
  runOverdueCheck,
  runPendingClearanceCheck,
} from './offboarding_daily';

export function registerJobs(): void {
  // Hourly SLA breach check
  cron.schedule('0 * * * *', () => {
    void runSlaCheck()
      .then((count) => {
        if (count > 0) logger.info(`SLA breach check processed: ${count} requests marked breached`);
      })
      .catch((error: unknown) => logger.error('SLA breach check job failed', { error }));
  });

  // Daily jobs at midnight
  cron.schedule('0 0 * * *', () => {
    void runExpiryAlerts()
      .then((count) => logger.info(`Expiry alerts processed: ${count}`))
      .catch((error: unknown) => logger.error('Expiry alerts job failed', { error }));

    void runCredentialVaultJobs()
      .then((res) => logger.info(`Credential vault jobs processed: ${JSON.stringify(res)}`))
      .catch((error: unknown) => logger.error('Credential vault jobs failed', { error }));

    void runNeedInfoReminders()
      .then((count) => {
        if (count > 0) logger.info(`Need info reminders sent: ${count}`);
      })
      .catch((error: unknown) => logger.error('Need info reminder job failed', { error }));

    void runAutoCloseFulfilled()
      .then((count) => {
        if (count > 0) logger.info(`Auto-closed fulfilled requests: ${count}`);
      })
      .catch((error: unknown) => logger.error('Auto close fulfilled job failed', { error }));

    // Phase 5: Offboarding daily jobs
    void runOffboardingReminders()
      .then((count) => {
        if (count > 0) logger.info(`Offboarding reminders sent: ${count}`);
      })
      .catch((error: unknown) => logger.error('Offboarding reminders job failed', { error }));

    void runLwdProcessing()
      .then((res) => logger.info(`LWD processing completed: ${JSON.stringify(res)}`))
      .catch((error: unknown) => logger.error('LWD processing job failed', { error }));

    void runOverdueCheck()
      .then((count) => {
        if (count > 0) logger.info(`Overdue offboarding returns flagged: ${count}`);
      })
      .catch((error: unknown) => logger.error('Overdue offboarding check job failed', { error }));

    void runPendingClearanceCheck()
      .then((count) => {
        if (count > 0) logger.info(`Pending clearance checks completed: ${count}`);
      })
      .catch((error: unknown) => logger.error('Pending clearance check job failed', { error }));
  });
}
