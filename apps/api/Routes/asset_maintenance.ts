import { Router } from 'express';
import { body } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation } from '../Utils/validations';
import { AssetMaintenanceController } from '../Controllers/asset_maintenance';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new AssetMaintenanceController();
const read = checkAccess(MODULES.ASSET_MAINTENANCE, ACCESS_TYPES.READ);
const write = checkAccess(MODULES.ASSET_MAINTENANCE, ACCESS_TYPES.WRITE);

router.post('/list', decryptPayload, userAuth, read, validate(listValidation), routeHandler((request) => controller.list(request)));
router.post('/add', decryptPayload, userAuth, write, validate([body('asset_id').isInt({ min: 1 }).toInt(), body('issue').isString().trim().notEmpty()]), routeHandler((request) => controller.add(request), true));
router.post('/update', decryptPayload, userAuth, write, validate([body('id').isInt({ min: 1 }).toInt()]), routeHandler((request) => controller.update(request)));
router.post('/complete', decryptPayload, userAuth, write, validate([body('id').isInt({ min: 1 }).toInt(), body('resolution').optional().isString()]), routeHandler((request) => controller.complete(request)));

export const assetMaintenanceRouter = Router();
assetMaintenanceRouter.use('/asset/maintenance', router);
