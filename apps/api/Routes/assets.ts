import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation, optionsValidation } from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';
import { AssetsController } from '../Controllers/assets';
import { routeHandler } from '../Utils/route_handler';

const router = Router();
const controller = new AssetsController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) =>
    callback(null, /\.(csv|xlsx)$/i.test(file.originalname)),
});
const read = checkAccess(MODULES.ASSET, ACCESS_TYPES.READ);
const write = checkAccess(MODULES.ASSET, ACCESS_TYPES.WRITE);
const remove = checkAccess(MODULES.ASSET, ACCESS_TYPES.DELETE);
const id = [param('id').isInt({ min: 1 }).toInt()];

router.post(
  '/list',
  decryptPayload,
  userAuth,
  read,
  validate(listValidation),
  routeHandler((request) => controller.list(request)),
);
router.post(
  '/unassigned/list',
  decryptPayload,
  userAuth,
  read,
  validate(listValidation),
  routeHandler((request) => controller.unassigned(request)),
);
router.post(
  '/add',
  decryptPayload,
  userAuth,
  write,
  validate([
    body('asset_tag').not().exists(),
    body('condition').optional().isIn(['new', 'good', 'fair', 'poor']),
    body('asset_status').optional().isInt({ min: 1, max: 6 }),
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
    body('condition').optional().isIn(['new', 'good', 'fair', 'poor']),
    body('asset_status').optional().isInt({ min: 1, max: 6 }),
  ]),
  routeHandler((request) => controller.update(request)),
);
router.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  read,
  validate(id),
  routeHandler((request) => controller.get(request)),
);
router.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  remove,
  validate(id),
  routeHandler((request) => controller.delete(request)),
);
router.post(
  '/options',
  decryptPayload,
  userAuth,
  read,
  validate(optionsValidation),
  routeHandler((request) => controller.options(request)),
);
router.get(
  '/qr/:id',
  decryptPayload,
  userAuth,
  read,
  validate(id),
  routeHandler((request, response) => controller.qr(request, response)),
);
router.get('/import/template', decryptPayload, userAuth, write, (request, response) =>
  controller.template(request, response),
);
router.post(
  '/import',
  decryptPayload,
  userAuth,
  write,
  upload.single('file'),
  routeHandler((request) => controller.import(request)),
);
router.post(
  '/export',
  decryptPayload,
  userAuth,
  read,
  validate(listValidation),
  routeHandler((request, response) => controller.export(request, response)),
);
registerActivityRoute({
  router,
  payloadDecrypt: decryptPayload,
  userAuth,
  checkAccess: read,
  module: MODULES.ASSET,
});

export const assetsRouter = Router();
assetsRouter.use('/asset', router);
