import { Router } from 'express';
import { param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { EmployeeInventoryController } from '../Controllers/employee_inventory';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new EmployeeInventoryController();
const id = [param('employee_id').isInt({ min: 1 }).toInt()];
router.get(
  '/assets/:employee_id',
  decryptPayload,
  userAuth,
  checkAccess(MODULES.ASSET_ASSIGNMENT, ACCESS_TYPES.READ),
  validate(id),
  routeHandler((request) => controller.assets(request)),
);
router.get(
  '/software/:employee_id',
  decryptPayload,
  userAuth,
  checkAccess(MODULES.SOFTWARE, ACCESS_TYPES.READ),
  validate(id),
  routeHandler((request) => controller.software(request)),
);

export const employeeInventoryRouter = Router();
employeeInventoryRouter.use('/employee', router);
