import { Router } from 'express';
import { param, body } from 'express-validator';
import { userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { NotificationsController } from '../Controllers/notifications';
import { realtimeService } from '../Services/realtime.service';

const router = Router();
const controller = new NotificationsController();

// 1. Health check for realtime system: GET /realtime/health
router.get('/realtime/health', userAuth, (_req, res) => {
  const stats = realtimeService.getHealth();
  res.handler.success(stats, 'Realtime service health.');
});

// 2. Legacy endpoints
router.get('/notifications', decryptPayload, userAuth, (req, res) => controller.list(req, res));

router.post(
  '/notifications/:id/read',
  decryptPayload,
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  (req, res) => controller.markRead(req, res),
);

// 3. Phase R Notification REST Endpoints (Own-data only)
router.post('/notification/list', decryptPayload, userAuth, (req, res) =>
  controller.list(req, res),
);

router.get('/notification/unread-count', userAuth, (req, res) => controller.unreadCount(req, res));

router.put(
  '/notification/read',
  decryptPayload,
  userAuth,
  validate([body('ids').isArray().withMessage('ids must be an array of numbers')]),
  (req, res) => controller.markRead(req, res),
);

router.put('/notification/read-all', decryptPayload, userAuth, (req, res) =>
  controller.markAllRead(req, res),
);

router.delete(
  '/notification/delete/:id',
  decryptPayload,
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  (req, res) => controller.delete(req, res),
);

router.get('/notification/preferences', userAuth, (req, res) =>
  controller.getPreferences(req, res),
);

router.put('/notification/preferences', decryptPayload, userAuth, (req, res) =>
  controller.updatePreferences(req, res),
);

export const notificationsRouter = Router();
notificationsRouter.use(router);
