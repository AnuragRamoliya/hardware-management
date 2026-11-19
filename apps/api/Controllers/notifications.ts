import type { Request, Response } from 'express';
import { NotificationService } from '../Services/notification';

const service = new NotificationService();

function getUserId(req: Request): number {
  return Number(req.userInfo?.id || 0);
}

export class NotificationsController {
  async list(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const data = await service.list(userId, req.body || req.query);
    // Legacy GET /notifications endpoint returns array of rows for backward compatibility
    if (req.method === 'GET' && req.path.endsWith('/notifications')) {
      res.handler.success(data.rows, 'Notifications fetched successfully.');
      return;
    }
    res.handler.success(data, 'Notifications fetched successfully.');
  }

  async unreadCount(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const count = await service.getUnreadCount(userId);
    res.handler.success({ count }, 'Unread notification count fetched.');
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const idParam = req.params.id ? Number(req.params.id) : null;
    const ids = idParam ? [idParam] : (req.body.ids as number[]);
    const affected = await service.markRead(userId, ids);
    res.handler.success({ affected }, 'Notifications marked as read.');
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const affected = await service.markAllRead(userId);
    res.handler.success({ affected }, 'All notifications marked as read.');
  }

  async delete(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const id = Number(req.params.id);
    const success = await service.delete(userId, id);
    if (!success) {
      res.handler.notFound('Notification not found.');
      return;
    }
    res.handler.success(null, 'Notification deleted.');
  }

  async getPreferences(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const data = await service.getPreferences(userId);
    res.handler.success(data, 'Notification preferences fetched.');
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const preferences = req.body.preferences || req.body;
    const data = await service.updatePreferences(
      userId,
      Array.isArray(preferences) ? preferences : [],
    );
    res.handler.success(data, 'Notification preferences updated.');
  }
}
