import { Router } from 'express';
import { body } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation, optionsValidation } from '../Utils/validations';
import { SoftwareLicensesController } from '../Controllers/software_licenses';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new SoftwareLicensesController();
const read = checkAccess(MODULES.SOFTWARE_LICENSE, ACCESS_TYPES.READ);
const write = checkAccess(MODULES.SOFTWARE_LICENSE, ACCESS_TYPES.WRITE);

router.post(
  '/list',
  decryptPayload,
  userAuth,
  read,
  validate(listValidation),
  routeHandler((request) => controller.list(request)),
);
router.post(
  '/add',
  decryptPayload,
  userAuth,
  write,
  validate([
    body('software_id').isInt({ min: 1 }).toInt(),
    body('seats_total').optional().isInt({ min: 1 }).toInt(),
  ]),
  routeHandler((request) => controller.add(request), true),
);
router.put(
  '/update',
  decryptPayload,
  userAuth,
  write,
  validate([
    body('id').isInt({ min: 1 }).toInt(),
    body('seats_total').optional().isInt({ min: 1 }).toInt(),
  ]),
  routeHandler((request) => controller.update(request)),
);
router.post(
  '/options',
  decryptPayload,
  userAuth,
  read,
  validate(optionsValidation),
  routeHandler((request) => controller.options(request)),
);

export const softwareLicensesRouter = Router();
softwareLicensesRouter.use('/software/license', router);
