import { Router } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation } from '../Utils/validations';
import { OffboardingTemplateController } from '../Controllers/offboarding_template';
import { routeHandler } from '../Utils/route_handler';

const controller = new OffboardingTemplateController();

const templateRead = checkAccess(MODULES.OFFBOARDING_TEMPLATE, ACCESS_TYPES.READ);
const templateWrite = checkAccess(MODULES.OFFBOARDING_TEMPLATE, ACCESS_TYPES.WRITE);
const templateDelete = checkAccess(MODULES.OFFBOARDING_TEMPLATE, ACCESS_TYPES.DELETE);

export const offboardingTemplateRouter = Router();

offboardingTemplateRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  templateRead,
  validate(listValidation),
  routeHandler((req) => controller.list(req)),
);

offboardingTemplateRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  templateRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.get(req)),
);

offboardingTemplateRouter.post(
  '/add',
  decryptPayload,
  userAuth,
  templateWrite,
  validate([
    body('title').isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('default_assignee_role').optional().isString(),
    body('is_mandatory').optional().isBoolean(),
    body('sort_order').optional().isInt(),
  ]),
  routeHandler((req) => controller.add(req)),
);

offboardingTemplateRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  templateWrite,
  validate([
    body('id').isInt({ min: 1 }).toInt(),
    body('title').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('default_assignee_role').optional().isString(),
    body('is_mandatory').optional().isBoolean(),
    body('sort_order').optional().isInt(),
    body('is_active').optional().isBoolean(),
  ]),
  routeHandler((req) => controller.update(req)),
);

offboardingTemplateRouter.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  templateDelete,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.delete(req)),
);

offboardingTemplateRouter.post(
  '/options',
  decryptPayload,
  userAuth,
  routeHandler(() => controller.options()),
);
