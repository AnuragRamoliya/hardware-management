import type { Transaction } from 'sequelize';
import { logger } from '../Config/logger';

type EmitterFn = () => Promise<void> | void;

/**
 * Executes the given emitter function ONLY after the Sequelize transaction commits.
 * If no transaction is provided, the function executes immediately.
 * If the transaction rolls back, the emitter is never called.
 */
export function emitAfterCommit(fn: EmitterFn, transaction?: Transaction | null): void {
  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(async () => {
      try {
        await fn();
      } catch (error) {
        logger.error('Failed to emit real-time event after commit:', error);
      }
    });
  } else {
    // No transaction; execute asynchronously to not block the current stack
    setImmediate(async () => {
      try {
        await fn();
      } catch (error) {
        logger.error('Failed to emit real-time event without transaction:', error);
      }
    });
  }
}
