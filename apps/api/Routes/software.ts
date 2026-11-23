import { Router } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation, optionsValidation } from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';
import { SoftwareController } from '../Controllers/software';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new SoftwareController();
const read = checkAccess(MODULES.SOFTWARE, ACCESS_TYPES.READ);
const write = checkAccess(MODULES.SOFTWARE, ACCESS_TYPES.WRITE);
const remove = checkAccess(MODULES.SOFTWARE, ACCESS_TYPES.DELETE);
const id = [param('id').isInt({ min: 1 }).toInt()];

router.post('/list', decryptPayload, userAuth, read, validate(listValidation), routeHandler((request) => controller.list(request)));
router.post('/add', decryptPayload, userAuth, write, validate([body('name').isString().trim().notEmpty(), body('category').isString().notEmpty(), body('license_type').isIn(['per_user', 'per_seat', 'subscription', 'perpetual', 'free'])]), routeHandler((request) => controller.add(request), true));
router.put('/update', decryptPayload, userAuth, write, validate([body('id').isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.update(request)));
router.get('/get/:id', decryptPayload, userAuth, read, validate(id), routeHandler((request) => controller.get(request)));
router.delete('/delete/:id', decryptPayload, userAuth, remove, validate(id), routeHandler((request) => controller.delete(request)));
router.post('/options', decryptPayload, userAuth, read, validate(optionsValidation), routeHandler((request) => controller.options(request)));

router.post('/assign', decryptPayload, userAuth, write, validate([body('software_id').isInt({ min: 1 }).toInt(), body('employee_id').isInt({ min: 1 }).toInt(), body('license_id').optional().isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.assign(request), true));
router.post('/revoke', decryptPayload, userAuth, write, validate([body('assignment_id').isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.revoke(request)));
router.post('/bulk/assign', decryptPayload, userAuth, write, validate([body('items').isArray({ min: 1, max: 100 }), body('all_or_nothing').optional().isBoolean().toBoolean()]), routeHandler((request) => controller.bulkAssign(request)));
router.get('/usage/:id', decryptPayload, userAuth, read, validate(id), routeHandler((request) => controller.usage(request)));
registerActivityRoute({ router, payloadDecrypt: decryptPayload, userAuth, checkAccess: read, module: MODULES.SOFTWARE });

export const softwareRouter = Router();
softwareRouter.use('/software', router);
