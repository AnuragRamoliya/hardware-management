import { Router } from 'express';
import { userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { DashboardController } from '../Controllers/dashboard';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new DashboardController();

router.get(
  '/dashboard/summary',
  decryptPayload,
  userAuth,
  routeHandler((req) => controller.summary(req)),
);

export const dashboardRouter = Router();
dashboardRouter.use(router);
