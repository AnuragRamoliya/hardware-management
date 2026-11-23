import { Router } from 'express';
import { body } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { AssetAssignmentsController } from '../Controllers/asset_assignments';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new AssetAssignmentsController();
const read = checkAccess(MODULES.ASSET, ACCESS_TYPES.READ);
const write = checkAccess(MODULES.ASSET_ASSIGNMENT, ACCESS_TYPES.WRITE);
const assetId = body('asset_id').isInt({ min: 1 }).toInt();

router.post('/assign', decryptPayload, userAuth, write, validate([assetId, body('employee_id').isInt({ min: 1 }).toInt(), body('due_return_date').optional().isDate()]), routeHandler((request) => controller.assign(request), true));
router.post('/return', decryptPayload, userAuth, write, validate([body('assignment_id').optional().isInt({ min: 1 }).toInt(), body('asset_id').optional().isInt({ min: 1 }).toInt(), body().custom((value) => Boolean(value.assignment_id || value.asset_id)), body('return_condition').optional().isIn(['new', 'good', 'fair', 'poor']), body('to_status').optional().isIn(['available', 'in_repair', 'retired', 'lost'])]), routeHandler((request) => controller.returnAsset(request)));
router.post('/transfer', decryptPayload, userAuth, write, validate([assetId, body('to_employee_id').isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.transfer(request)));
router.post('/bulk/assign', decryptPayload, userAuth, write, validate([body('items').isArray({ min: 1, max: 100 }), body('all_or_nothing').optional().isBoolean().toBoolean()]), routeHandler((request) => controller.bulkAssign(request)));
router.post('/bulk/return', decryptPayload, userAuth, write, validate([body('items').isArray({ min: 1, max: 100 }), body('all_or_nothing').optional().isBoolean().toBoolean()]), routeHandler((request) => controller.bulkReturn(request)));
router.post('/history', decryptPayload, userAuth, read, validate([body('asset_id').isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.history(request)));

export const assetAssignmentsRouter = Router();
assetAssignmentsRouter.use('/asset', router);
