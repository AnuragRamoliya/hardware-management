import { Router } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, checkOptionsAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation } from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';
import { RequestsController, PortalRequestsController } from '../Controllers/requests';
import { routeHandler } from '../Utils/route_handler';

const adminController = new RequestsController();
const portalController = new PortalRequestsController();

// Admin Permissions for MODULES.REQUEST
const requestRead = checkAccess(MODULES.REQUEST, ACCESS_TYPES.READ);
const requestWrite = checkAccess(MODULES.REQUEST, ACCESS_TYPES.WRITE);
const requestApprove = checkAccess(MODULES.REQUEST, ACCESS_TYPES.APPROVE);
const requestOptions = checkOptionsAccess(MODULES.REQUEST);

// ==========================================
// Admin Request Router (/request/*)
// ==========================================
const adminRouter = Router();

adminRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  requestRead,
  validate(listValidation),
  routeHandler((req) => adminController.list(req)),
);

adminRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  requestRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => adminController.get(req)),
);

adminRouter.put(
  '/take',
  decryptPayload,
  userAuth,
  requestWrite,
  validate([body('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => adminController.take(req)),
);

adminRouter.put(
  '/assign',
  decryptPayload,
  userAuth,
  requestWrite,
  validate([body('id').isInt({ min: 1 }).toInt(), body('assigned_to').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => adminController.assign(req)),
);

adminRouter.post(
  '/bulk/assign',
  decryptPayload,
  userAuth,
  requestWrite,
  validate([
    body('request_ids').isArray({ min: 1 }),
    body('request_ids.*').isInt({ min: 1 }).toInt(),
    body('assigned_to').isInt({ min: 1 }).toInt(),
  ]),
  routeHandler((req) => adminController.bulkAssign(req)),
);

adminRouter.put(
  '/review',
  decryptPayload,
  userAuth,
  requestApprove,
  validate([
    body('id').isInt({ min: 1 }).toInt(),
    body('action').isIn(['start_review', 'approve', 'reject', 'need_info']),
    body('feedback').optional().isString(),
    body('awaiting_stock').optional().isBoolean(),
  ]),
  routeHandler((req) => adminController.review(req)),
);

adminRouter.put(
  '/fulfil',
  decryptPayload,
  userAuth,
  requestApprove,
  validate([body('request_id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => adminController.fulfil(req)),
);

adminRouter.put(
  '/close',
  decryptPayload,
  userAuth,
  requestWrite,
  validate([body('id').isInt({ min: 1 }).toInt(), body('notes').optional().isString()]),
  routeHandler((req) => adminController.close(req)),
);

adminRouter.post(
  '/comment',
  decryptPayload,
  userAuth,
  requestWrite,
  validate([
    body('request_id').isInt({ min: 1 }).toInt(),
    body('comment').isString().trim().notEmpty(),
    body('is_internal').optional().isBoolean(),
  ]),
  routeHandler((req) => adminController.comment(req)),
);

adminRouter.get(
  '/stats',
  decryptPayload,
  userAuth,
  requestRead,
  routeHandler((req) => adminController.stats(req)),
);

adminRouter.post(
  '/options',
  decryptPayload,
  userAuth,
  requestOptions,
  routeHandler(() => adminController.options()),
);

adminRouter.post(
  '/export',
  decryptPayload,
  userAuth,
  requestRead,
  routeHandler((req) => adminController.export(req)),
);

registerActivityRoute({
  router: adminRouter,
  payloadDecrypt: decryptPayload,
  userAuth,
  checkAccess: requestRead,
  module: MODULES.REQUEST,
});

// ==========================================
// Portal Request Router (/portal/request/*)
// ==========================================
const portalRouter = Router();

portalRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  validate(listValidation),
  routeHandler((req) => portalController.list(req)),
);

portalRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => portalController.get(req)),
);

portalRouter.post(
  '/add',
  decryptPayload,
  userAuth,
  validate([
    body('request_type').isInt({ min: 1, max: 5 }).toInt(),
    body('title').isString().trim().notEmpty(),
    body('reason').isString().trim().notEmpty(),
    body('priority').optional().isInt({ min: 1, max: 4 }).toInt(),
    body('category_id').optional().isInt({ min: 1 }).toInt(),
    body('current_asset_id').optional().isInt({ min: 1 }).toInt(),
    body('software_id').optional().isInt({ min: 1 }).toInt(),
    body('needed_by_date').optional().isISO8601(),
  ]),
  routeHandler((req) => portalController.add(req), true),
);

portalRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  validate([
    body('id').isInt({ min: 1 }).toInt(),
    body('title').optional().isString().trim(),
    body('reason').optional().isString().trim(),
    body('needed_by_date').optional().isISO8601(),
    body('priority').optional().isInt({ min: 1, max: 4 }).toInt(),
  ]),
  routeHandler((req) => portalController.update(req)),
);

portalRouter.put(
  '/cancel',
  decryptPayload,
  userAuth,
  validate([body('id').isInt({ min: 1 }).toInt(), body('reason').optional().isString().trim()]),
  routeHandler((req) => portalController.cancel(req)),
);

portalRouter.post(
  '/comment',
  decryptPayload,
  userAuth,
  validate([
    body('request_id').isInt({ min: 1 }).toInt(),
    body('comment').isString().trim().notEmpty(),
  ]),
  routeHandler((req) => portalController.comment(req)),
);

portalRouter.post(
  '/attachment',
  decryptPayload,
  userAuth,
  validate([
    body('request_id').isInt({ min: 1 }).toInt(),
    body('file_name').isString().notEmpty(),
    body('file_path').isString().notEmpty(),
    body('mime_type').isString().notEmpty(),
    body('size').isInt({ min: 1 }).toInt(),
  ]),
  routeHandler((req) => portalController.attachment(req)),
);

portalRouter.get(
  '/options',
  decryptPayload,
  userAuth,
  routeHandler((req) => portalController.options(req)),
);

// Combine into phase4Router
export const phase4Router = Router();
phase4Router.use('/request', adminRouter);
phase4Router.use('/portal/request', portalRouter);
