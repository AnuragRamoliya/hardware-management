import { Op, type Transaction } from 'sequelize';
import type { RowAttributes } from '../Database/Schema';
import { AssetRecord as assets } from '../Models/assets';
import { AssetAssignmentRecord as asset_assignments } from '../Models/asset_assignment';
import { SoftwareRecord as software } from '../Models/software';
import { SoftwareLicenseRecord as software_licenses } from '../Models/software_license';
import { NotificationRecord as notifications } from '../Models/notifications';
import {
  credentials,
  credential_collection_requests,
  notification_preferences,
} from '../Database/Schema';
import {
  COLLECTION_REQUEST_STATUS,
  CREDENTIAL_APPROVAL_STATUS,
  REALTIME_EVENTS,
  REALTIME_ROOMS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITY,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationPayload,
  type NotificationPreferencesDto,
} from '@hm/shared';
import { realtimeService } from './realtime.service';
import { logger } from '../Config/logger';
import { getSorting } from '../Utils/helpers';

const dayMs = 86_400_000;
function remainingDays(value: unknown): number {
  const date = new Date(String(value));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / dayMs);
}

function threshold(days: number): number | undefined {
  if (days < 0 || days > 30) return undefined;
  return [7, 15, 30].find((limit) => days <= limit);
}

export interface CreateNotificationOptions {
  recipient_user_id: number;
  category?: NotificationCategory;
  title: string;
  body?: string;
  message?: string;
  entity_type?: string;
  entity_id?: number;
  link?: string;
  priority?: NotificationPriority;
  kind?: string;
  threshold_days?: number;
  transaction?: Transaction | null;
}

/**
 * Central notification creation helper.
 * 1. Checks recipient's notification_preferences (in_app / email).
 * 2. Persists to notifications table.
 * 3. Emits real-time event notification.created after transaction commits.
 */
export async function createNotification(
  options: CreateNotificationOptions,
): Promise<RowAttributes | null> {
  const {
    recipient_user_id,
    category = NOTIFICATION_CATEGORIES.SYSTEM,
    title,
    body,
    message = body || title,
    entity_type,
    entity_id,
    link,
    priority = NOTIFICATION_PRIORITY.NORMAL,
    kind = category,
    threshold_days,
    transaction,
  } = options;

  try {
    // 1. Check user preferences
    const pref = await notification_preferences.findOne({
      where: { user_id: recipient_user_id, category },
      transaction,
    });

    const inAppEnabled = pref ? Number(pref.get('in_app')) === 1 : true;
    if (!inAppEnabled) {
      logger.info(
        `In-app notification skipped for user ${recipient_user_id} based on category "${category}" preference.`,
      );
      return null;
    }

    // 2. Persist notification
    const notification = await notifications.create(
      {
        recipient_user_id,
        category,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        kind,
        record_type: entity_type || kind,
        record_id: entity_id || 0,
        threshold_days: threshold_days ?? null,
        title,
        body: body || message,
        message,
        link: link || null,
        priority,
        status: 1,
      },
      { transaction },
    );

    const plainRecord = notification.get({ plain: true }) as RowAttributes;

    const payload: NotificationPayload = {
      id: Number(plainRecord.id),
      category: category as NotificationCategory,
      entity_type: (plainRecord.entity_type as string) || null,
      entity_id: plainRecord.entity_id ? Number(plainRecord.entity_id) : null,
      title: String(plainRecord.title),
      body: String(plainRecord.body || plainRecord.message),
      link: (plainRecord.link as string) || null,
      priority: Number(plainRecord.priority || 2) as NotificationPriority,
      read_at: null,
      createdAt: new Date().toISOString(),
    };

    // 3. Emit real-time event after commit
    realtimeService.publish({
      event: REALTIME_EVENTS.NOTIFICATION_CREATED,
      rooms: REALTIME_ROOMS.user(recipient_user_id),
      data: payload,
      transaction,
    });

    return plainRecord;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    return null;
  }
}

async function createAlert(
  kind: string,
  recordType: string,
  recordId: number,
  days: number,
  title: string,
  message: string,
) {
  const existing = await notifications.findOne({
    where: { kind, record_type: recordType, record_id: recordId, threshold_days: days },
  });
  if (!existing) {
    // Notify admin / managers
    const [adminUsers] = await notifications.sequelize!.query(
      "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.type IN ('super_admin', 'hardware_manager') AND u.status = 1",
    );
    for (const u of adminUsers as Array<{ id: number }>) {
      await createNotification({
        recipient_user_id: u.id,
        category: NOTIFICATION_CATEGORIES.ASSET,
        kind,
        entity_type: recordType,
        entity_id: recordId,
        threshold_days: days,
        title,
        body: message,
        message,
      });
    }
  }
}

export async function runExpiryAlerts(): Promise<number> {
  let created = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 30 * dayMs);
  const [assetRows, softwareRows, licenseRows, assignmentRows] = await Promise.all([
    assets.findAll({ where: { status: 1, warranty_end: { [Op.between]: [today, limit] } } }),
    software.findAll({ where: { status: 1, renewal_date: { [Op.between]: [today, limit] } } }),
    software_licenses.findAll({
      where: { status: 1, expiry_date: { [Op.between]: [today, limit] } },
    }),
    asset_assignments.findAll({
      where: { status: 1, returned_at: null, due_return_date: { [Op.lt]: today } },
    }),
  ]);
  for (const row of assetRows) {
    const days = threshold(remainingDays(row.get('warranty_end')));
    if (days === undefined) continue;
    await createAlert(
      'warranty_expiry',
      'asset',
      Number(row.get('id')),
      days,
      'Warranty expiring',
      `Asset ${String(row.get('asset_tag'))} warranty expires soon.`,
    );
    created += 1;
  }
  for (const row of softwareRows) {
    const days = threshold(remainingDays(row.get('renewal_date')));
    if (days === undefined) continue;
    await createAlert(
      'software_renewal',
      'software',
      Number(row.get('id')),
      days,
      'Software renewal due',
      `${String(row.get('name'))} renewal is due soon.`,
    );
    created += 1;
  }
  for (const row of licenseRows) {
    const days = threshold(remainingDays(row.get('expiry_date')));
    if (days === undefined) continue;
    await createAlert(
      'license_expiry',
      'software_license',
      Number(row.get('id')),
      days,
      'License expiring',
      `Software license ${String(row.get('id'))} expires soon.`,
    );
    created += 1;
  }
  for (const row of assignmentRows) {
    await createAlert(
      'asset_overdue',
      'asset_assignment',
      Number(row.get('id')),
      0,
      'Asset return overdue',
      `Asset assignment ${String(row.get('id'))} is past its return date.`,
    );
    created += 1;
  }
  return created;
}

export async function runCredentialVaultJobs(): Promise<{
  expiring: number;
  overdue: number;
  pending: number;
}> {
  let expiring = 0;
  let overdue = 0;
  let pending = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 30 * dayMs);

  // 1. Expiring credentials
  const expiringCreds = await credentials.findAll({
    where: {
      status: 1,
      expires_at: { [Op.between]: [today, limit] },
    },
  });

  for (const row of expiringCreds) {
    const days = threshold(remainingDays(row.get('expires_at')));
    if (days === undefined) continue;
    await createAlert(
      'credential_expiry',
      'credential',
      Number(row.get('id')),
      days,
      'Credential Expiring Soon',
      `Credential "${String(row.get('label'))}" expires in ${days} days.`,
    );
    expiring += 1;
  }

  // 2. Overdue collection requests
  const overdueRequests = await credential_collection_requests.findAll({
    where: {
      status: 1,
      request_status: COLLECTION_REQUEST_STATUS.PENDING,
      due_date: { [Op.lt]: today },
    },
  });

  for (const req of overdueRequests) {
    await req.update({ request_status: COLLECTION_REQUEST_STATUS.OVERDUE });
    await createAlert(
      'credential_request_overdue',
      'credential_collection_request',
      Number(req.get('id')),
      0,
      'Credential Collection Overdue',
      `Credential collection request #${req.get('id')} is past its due date.`,
    );
    overdue += 1;
  }

  // 3. Pending approvals summary
  const pendingCount = await credentials.count({
    where: {
      status: 1,
      approval_status: CREDENTIAL_APPROVAL_STATUS.PENDING,
    },
  });

  if (pendingCount > 0) {
    pending = pendingCount;
  }

  return { expiring, overdue, pending };
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  unread?: boolean;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export class NotificationService {
  /**
   * Lists notifications for the authenticated user with filtering and pagination.
   */
  async list(
    userId: number,
    query: ListNotificationsQuery = {},
  ): Promise<{ rows: RowAttributes[]; count: number; unread_count: number }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const offset = (page - 1) * limit;

    const where: Record<string | symbol, unknown> = {
      status: 1,
      [Op.or]: [{ recipient_user_id: userId }, { recipient_user_id: null }],
    };

    if (query.unread === true) {
      where.read_at = null;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = {
        [Op.between]: [new Date(query.startDate), new Date(query.endDate)],
      };
    } else if (query.startDate) {
      where.createdAt = { [Op.gte]: new Date(query.startDate) };
    } else if (query.endDate) {
      where.createdAt = { [Op.lte]: new Date(query.endDate) };
    }

    const allowedNotificationColumns = new Set([
      'id',
      'title',
      'category',
      'priority',
      'read_at',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const order = getSorting(
      query as unknown as import('../Types/api').ListDto,
      allowedNotificationColumns,
      [['createdAt', 'DESC']],
    );

    const [{ rows, count }, unreadCount] = await Promise.all([
      notifications.findAndCountAll({
        where,
        order,
        limit,
        offset,
      }),
      this.getUnreadCount(userId),
    ]);

    return {
      rows: rows.map((r) => r.get({ plain: true }) as RowAttributes),
      count,
      unread_count: unreadCount,
    };
  }

  /**
   * Retrieves the unread notification count for a user.
   */
  async getUnreadCount(userId: number): Promise<number> {
    return notifications.count({
      where: {
        status: 1,
        read_at: null,
        [Op.or]: [{ recipient_user_id: userId }, { recipient_user_id: null }],
      },
    });
  }

  /**
   * Marks specified notification IDs as read for a user.
   */
  async markRead(userId: number, ids: number | number[]): Promise<number> {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    const [affectedCount] = await notifications.update(
      { read_at: new Date() },
      {
        where: {
          id: { [Op.in]: targetIds },
          status: 1,
          read_at: null,
          [Op.or]: [{ recipient_user_id: userId }, { recipient_user_id: null }],
        },
      },
    );

    const unreadCount = await this.getUnreadCount(userId);

    // Emit read_updated event
    realtimeService.publish({
      event: REALTIME_EVENTS.NOTIFICATION_READ,
      rooms: REALTIME_ROOMS.user(userId),
      data: { ids: targetIds, unread_count: unreadCount },
    });

    return affectedCount;
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllRead(userId: number): Promise<number> {
    const [affectedCount] = await notifications.update(
      { read_at: new Date() },
      {
        where: {
          status: 1,
          read_at: null,
          [Op.or]: [{ recipient_user_id: userId }, { recipient_user_id: null }],
        },
      },
    );

    // Emit read_all event
    realtimeService.publish({
      event: REALTIME_EVENTS.NOTIFICATION_READ_ALL,
      rooms: REALTIME_ROOMS.user(userId),
      data: { unread_count: 0 },
    });

    return affectedCount;
  }

  /**
   * Soft-deletes a notification belonging to the user.
   */
  async delete(userId: number, id: number): Promise<boolean> {
    const [affectedCount] = await notifications.update(
      { status: 2 },
      {
        where: {
          id,
          [Op.or]: [{ recipient_user_id: userId }, { recipient_user_id: null }],
        },
      },
    );
    return affectedCount > 0;
  }

  /**
   * Gets notification preferences for a user, initializing defaults if none exist.
   */
  async getPreferences(userId: number): Promise<NotificationPreferencesDto[]> {
    const defaultCategories: NotificationCategory[] = [
      NOTIFICATION_CATEGORIES.REQUEST,
      NOTIFICATION_CATEGORIES.CREDENTIAL,
      NOTIFICATION_CATEGORIES.ASSET,
      NOTIFICATION_CATEGORIES.SOFTWARE,
      NOTIFICATION_CATEGORIES.OFFBOARDING,
      NOTIFICATION_CATEGORIES.SYSTEM,
    ];

    const existing = await notification_preferences.findAll({
      where: { user_id: userId, status: 1 },
    });

    const prefMap = new Map<string, import('sequelize').Model<RowAttributes, RowAttributes>>();
    for (const p of existing) {
      prefMap.set(String(p.get('category')), p);
    }

    const results: NotificationPreferencesDto[] = [];
    for (const cat of defaultCategories) {
      const p = prefMap.get(cat);
      if (p) {
        results.push({
          category: cat,
          in_app: Number(p.get('in_app')) === 1,
          email: Number(p.get('email')) === 1,
          desktop: Number(p.get('desktop')) === 1,
          sound: Number(p.get('sound')) === 1,
        });
      } else {
        results.push({
          category: cat,
          in_app: true,
          email: true,
          desktop: false,
          sound: true,
        });
      }
    }

    return results;
  }

  /**
   * Updates notification preferences for a user.
   */
  async updatePreferences(
    userId: number,
    preferences: NotificationPreferencesDto[],
  ): Promise<NotificationPreferencesDto[]> {
    for (const pref of preferences) {
      const existing = await notification_preferences.findOne({
        where: { user_id: userId, category: pref.category },
      });

      if (existing) {
        await existing.update({
          in_app: pref.in_app ? 1 : 0,
          email: pref.email ? 1 : 0,
          desktop: pref.desktop ? 1 : 0,
          sound: pref.sound ? 1 : 0,
        });
      } else {
        await notification_preferences.create({
          user_id: userId,
          category: pref.category,
          in_app: pref.in_app ? 1 : 0,
          email: pref.email ? 1 : 0,
          desktop: pref.desktop ? 1 : 0,
          sound: pref.sound ? 1 : 0,
          status: 1,
        });
      }
    }

    return this.getPreferences(userId);
  }
}
