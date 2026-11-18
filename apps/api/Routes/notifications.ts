import { Router } from 'express';
import { param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { NotificationsController } from '../Controllers/notifications';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new NotificationsController();
const inventoryRead = checkAccess(MODULES.ASSET, ACCESS_TYPES.READ);
router.get('/notifications', decryptPayload, userAuth, inventoryRead, routeHandler(() => controller.list()));
router.post('/notifications/:id/read', decryptPayload, userAuth, inventoryRead, validate([param('id').isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.markRead(Number(request.params.id))));
export const notificationsRouter = Router();
notificationsRouter.use(router);
