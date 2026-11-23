import { Router } from 'express';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { DashboardController } from '../Controllers/dashboard';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new DashboardController();
router.get('/dashboard/summary', decryptPayload, userAuth, checkAccess(MODULES.ASSET, ACCESS_TYPES.READ), routeHandler(() => controller.summary()));
export const dashboardRouter = Router();
dashboardRouter.use(router);
