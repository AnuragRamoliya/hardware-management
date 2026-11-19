import type { Transaction } from 'sequelize';
import { emitAfterCommit } from '../Utils/emit_after_commit';
import { realtimeGateway } from '../Realtime/gateway';
import { logger } from '../Config/logger';

// List of sensitive payload keys that must never be emitted over real-time
const FORBIDDEN_KEYS = new Set([
  'password',
  'password_enc',
  'token',
  'refresh_token',
  'secret',
  'secret_key',
  'encryption_key',
  'iv',
  'auth_tag',
  'license_key',
  'otp',
]);

/**
 * Recursively strips any forbidden keys from the payload before emission.
 */
function sanitizePayload<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item)) as unknown as T;
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizePayload(value);
    } else {
      clean[key] = value;
    }
  }

  return clean as T;
}

export interface PublishOptions<T> {
  event: string;
  rooms: string | string[];
  data: T;
  actor?: { id: number; name: string; role?: string } | null;
  transaction?: Transaction | null;
}

export class RealtimeService {
  /**
   * Publishes a real-time event to one or more rooms.
   * Guarantees emission occurs strictly AFTER database transaction commit.
   * Automatically sanitizes payloads to protect sensitive credentials and secrets.
   */
  public publish<T = unknown>(options: PublishOptions<T>): void {
    const { event, rooms, data, actor, transaction } = options;

    emitAfterCommit(() => {
      try {
        const sanitizedData = sanitizePayload(data);
        realtimeGateway.publish(event, rooms, sanitizedData, actor);
      } catch (err) {
        logger.error(`Failed to publish realtime event "${event}":`, err);
      }
    }, transaction);
  }

  /**
   * Disconnects a user across all active socket instances.
   */
  public disconnectUser(userId: number, reason: string): void {
    realtimeGateway.disconnectUser(userId, reason);
  }

  /**
   * Disconnects a revoked token across all active socket instances.
   */
  public disconnectToken(token: string, reason: string): void {
    realtimeGateway.disconnectToken(token, reason);
  }

  /**
   * Health metrics.
   */
  public getHealth() {
    return realtimeGateway.getStats();
  }
}

export const realtimeService = new RealtimeService();
