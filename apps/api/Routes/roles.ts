import { Router } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { createResourceRouter } from '../Utils/route_factory';
import { RoleController } from '../Controllers/roles';

export const roleController = new RoleController();
export const roleRouter = createResourceRouter(MODULES.ROLE, roleController, ['name', 'type']);

roleRouter.get(
  '/:id/permissions',
  decryptPayload,
  userAuth,
  checkAccess(MODULES.ROLE, ACCESS_TYPES.READ),
  validate([param('id').isInt({ min: 1 })]),
  roleController.getPermissions.bind(roleController),
);

roleRouter.put(
  '/:id/permissions',
  decryptPayload,
  userAuth,
  checkAccess(MODULES.ROLE, ACCESS_TYPES.WRITE),
  validate([
    param('id').isInt({ min: 1 }),
    body('permissions').isArray(),
    body('permissions.*.module_id').isInt({ min: 1 }),
    body('permissions.*.options_access').optional().isBoolean().toBoolean(),
  ]),
  roleController.setPermissions.bind(roleController),
);
