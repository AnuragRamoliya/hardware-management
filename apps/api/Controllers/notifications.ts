import { NotificationService } from '../Services/notification';

const notifications = new NotificationService();

export class NotificationsController {
  async list() { return notifications.list(); }
  async markRead(id: number) {
    await notifications.markRead(id);
    return { read: true };
  }
}
