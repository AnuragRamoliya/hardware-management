import { Router } from 'express';
import { userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { EmployeeInventoryController } from '../Controllers/employee_inventory';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new EmployeeInventoryController();
router.get(
  '/assets',
  decryptPayload,
  userAuth,
  routeHandler((request) => controller.portalAssets(request)),
);
router.get(
  '/software',
  decryptPayload,
  userAuth,
  routeHandler((request) => controller.portalSoftware(request)),
);

export const portalRouter = Router();
portalRouter.use('/portal', router);
