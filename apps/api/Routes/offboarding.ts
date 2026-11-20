import { Router } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation } from '../Utils/validations';
import { OffboardingController } from '../Controllers/offboarding';
import { routeHandler } from '../Utils/route_handler';

const controller = new OffboardingController();

const offboardingRead = checkAccess(MODULES.OFFBOARDING, ACCESS_TYPES.READ);
const offboardingWrite = checkAccess(MODULES.OFFBOARDING, ACCESS_TYPES.WRITE);
const offboardingApprove = checkAccess(MODULES.OFFBOARDING, ACCESS_TYPES.APPROVE);

export const offboardingRouter = Router();

// Case Management
offboardingRouter.post(
  '/preview',
  decryptPayload,
  userAuth,
  offboardingRead,
  validate([body('employee_id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.preview(req)),
);

offboardingRouter.post(
  '/initiate',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('employee_id').isInt({ min: 1 }).toInt(),
    body('exit_type').isInt({ min: 1, max: 5 }).toInt(),
    body('resignation_date').isDate(),
    body('last_working_date').isDate(),
    body('reason').isString().trim().notEmpty(),
    body('handover_to').optional().isInt({ min: 1 }).toInt(),
    body('notes').optional().isString(),
    body('checklist_template_ids').optional().isArray(),
  ]),
  routeHandler((req) => controller.initiate(req)),
);

offboardingRouter.post(
  ['/list', '/cases'],
  decryptPayload,
  userAuth,
  offboardingRead,
  validate(listValidation),
  routeHandler((req) => controller.list(req)),
);

offboardingRouter.get(
  ['/get/:id', '/cases/:id'],
  decryptPayload,
  userAuth,
  offboardingRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.get(req)),
);

offboardingRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('id').isInt({ min: 1 }).toInt(),
    body('last_working_date').optional().isDate(),
    body('handover_to').optional().isInt({ min: 1 }).toInt(),
    body('notes').optional().isString(),
    body('reason').optional().isString(),
  ]),
  routeHandler((req) => controller.update(req)),
);

offboardingRouter.put(
  ['/update/:id', '/cases/:id'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    param('id').isInt({ min: 1 }).toInt(),
    body('last_working_date').optional().isDate(),
    body('handover_to').optional().isInt({ min: 1 }).toInt(),
    body('notes').optional().isString(),
    body('reason').optional().isString(),
  ]),
  routeHandler((req) => {
    req.body.id = Number(req.params.id);
    return controller.update(req);
  }),
);

offboardingRouter.put(
  ['/cancel', '/cancel/:id', '/cases/:id/cancel'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('id').optional().isInt({ min: 1 }).toInt(),
    body('reason').optional().isString().trim(),
  ]),
  routeHandler((req) => {
    if (req.params.id) req.body.id = Number(req.params.id);
    if (!req.body.reason) req.body.reason = 'Cancelled by administrator';
    return controller.cancel(req);
  }),
);

offboardingRouter.post(
  ['/cancel/:id', '/cases/:id/cancel'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([param('id').isInt({ min: 1 }).toInt(), body('reason').optional().isString().trim()]),
  routeHandler((req) => {
    req.body.id = Number(req.params.id);
    if (!req.body.reason) req.body.reason = 'Cancelled by administrator';
    return controller.cancel(req);
  }),
);

offboardingRouter.put(
  '/complete',
  decryptPayload,
  userAuth,
  offboardingApprove,
  validate([body('id').isInt({ min: 1 }).toInt(), body('clearance_notes').optional().isString()]),
  routeHandler((req) => controller.complete(req)),
);

offboardingRouter.get(
  '/stats',
  decryptPayload,
  userAuth,
  offboardingRead,
  routeHandler(() => controller.stats()),
);

offboardingRouter.post(
  '/activity',
  decryptPayload,
  userAuth,
  offboardingRead,
  routeHandler((req) => controller.activity(req)),
);

// Task Queue Endpoints
offboardingRouter.post(
  ['/task/list', '/tasks'],
  decryptPayload,
  userAuth,
  offboardingRead,
  validate(listValidation),
  routeHandler((req) => controller.listTasks(req)),
);

offboardingRouter.put(
  '/task/receive',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('task_id').isInt({ min: 1 }).toInt(),
    body('return_condition').optional().isIn(['new', 'good', 'fair', 'poor', 'damaged', 'missing']),
    body('to_status').optional().isIn(['available', 'in_repair', 'retired', 'lost']),
    body('notes').optional().isString(),
  ]),
  routeHandler((req) => controller.receiveTask(req)),
);

offboardingRouter.put(
  '/task/bulk-receive',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([body('items').isArray({ min: 1 })]),
  routeHandler((req) => controller.bulkReceiveTasks(req)),
);

offboardingRouter.put(
  ['/task/complete', '/tasks/:id/complete', '/task/complete/:id'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('task_id').optional().isInt({ min: 1 }).toInt(),
    body('notes').optional().isString(),
  ]),
  routeHandler((req) => {
    if (req.params.id) req.body.task_id = Number(req.params.id);
    return controller.completeTask(req);
  }),
);

offboardingRouter.post(
  ['/tasks/:id/complete', '/task/complete/:id'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([param('id').isInt({ min: 1 }).toInt(), body('notes').optional().isString()]),
  routeHandler((req) => {
    req.body.task_id = Number(req.params.id);
    return controller.completeTask(req);
  }),
);

offboardingRouter.put(
  ['/task/waive', '/tasks/:id/waive', '/task/waive/:id'],
  decryptPayload,
  userAuth,
  offboardingApprove,
  validate([
    body('task_id').optional().isInt({ min: 1 }).toInt(),
    body('reason').optional().isString().trim(),
    body('notes').optional().isString().trim(),
  ]),
  routeHandler((req) => {
    if (req.params.id) req.body.task_id = Number(req.params.id);
    req.body.reason = req.body.reason || req.body.notes || 'Waived by authorized staff';
    return controller.waiveTask(req);
  }),
);

offboardingRouter.post(
  ['/tasks/:id/waive', '/task/waive/:id'],
  decryptPayload,
  userAuth,
  offboardingApprove,
  validate([
    param('id').isInt({ min: 1 }).toInt(),
    body('reason').optional().isString().trim(),
    body('notes').optional().isString().trim(),
  ]),
  routeHandler((req) => {
    req.body.task_id = Number(req.params.id);
    req.body.reason = req.body.reason || req.body.notes || 'Waived by authorized staff';
    return controller.waiveTask(req);
  }),
);

offboardingRouter.put(
  ['/task/exception', '/tasks/:id/exception', '/task/exception/:id'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('task_id').optional().isInt({ min: 1 }).toInt(),
    body('notes').optional().isString().trim(),
    body('to_status').optional().isIn(['lost', 'in_repair']),
  ]),
  routeHandler((req) => {
    if (req.params.id) req.body.task_id = Number(req.params.id);
    if (!req.body.notes) req.body.notes = 'Marked exception by staff';
    return controller.exceptionTask(req);
  }),
);

offboardingRouter.post(
  ['/tasks/:id/exception', '/task/exception/:id'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    param('id').isInt({ min: 1 }).toInt(),
    body('notes').optional().isString().trim(),
    body('to_status').optional().isIn(['lost', 'in_repair']),
  ]),
  routeHandler((req) => {
    req.body.task_id = Number(req.params.id);
    if (!req.body.notes) req.body.notes = 'Marked exception by staff';
    return controller.exceptionTask(req);
  }),
);

offboardingRouter.put(
  '/task/reassign',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('task_id').isInt({ min: 1 }).toInt(),
    body('assigned_to').isInt({ min: 1 }).toInt(),
  ]),
  routeHandler((req) => controller.reassignTask(req)),
);

offboardingRouter.post(
  '/task/add',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('case_id').isInt({ min: 1 }).toInt(),
    body('title').isString().trim().notEmpty(),
    body('is_mandatory').optional().isBoolean(),
    body('due_date').optional().isDate(),
    body('assigned_to').optional().isInt({ min: 1 }).toInt(),
  ]),
  routeHandler((req) => controller.addTask(req)),
);

offboardingRouter.post(
  '/receive-by-tag',
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([
    body('asset_tag').isString().trim().notEmpty(),
    body('condition').optional().isString(),
    body('notes').optional().isString(),
  ]),
  routeHandler((req) => controller.receiveByTag(req)),
);

offboardingRouter.post(
  '/verify-document',
  validate([body('code').isString().trim().notEmpty()]),
  routeHandler((req) => controller.verifyDocument(req)),
);

offboardingRouter.put(
  ['/task/update/:id', '/tasks/:id'],
  decryptPayload,
  userAuth,
  offboardingWrite,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => {
    req.body.task_id = Number(req.params.id);
    return controller.completeTask(req);
  }),
);

offboardingRouter.post(
  '/scan',
  decryptPayload,
  userAuth,
  offboardingRead,
  validate([body('asset_tag').isString().trim().notEmpty()]),
  routeHandler((req) => controller.scanAsset(req)),
);

// PDF Downloads
offboardingRouter.get(
  ['/clearance/:id', '/cases/:id/clearance-pdf', '/clearance-pdf/:id'],
  userAuth,
  offboardingRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  (req, res, next) => {
    controller.downloadClearance(req, res).catch(next);
  },
);

offboardingRouter.get(
  '/handover-receipt/:id',
  userAuth,
  offboardingRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  (req, res, next) => {
    controller.downloadHandoverReceipt(req, res).catch(next);
  },
);

// Self-Service Portal Endpoint
export const portalOffboardingRouter = Router();

portalOffboardingRouter.get(
  '/offboarding',
  decryptPayload,
  userAuth,
  routeHandler((req) => controller.portalGet(req)),
);

portalOffboardingRouter.get(
  '/offboarding/clearance/:id',
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  (req, res, next) => {
    controller.downloadClearance(req, res).catch(next);
  },
);

portalOffboardingRouter.get(
  '/offboarding/handover-receipt/:id',
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  (req, res, next) => {
    controller.downloadHandoverReceipt(req, res).catch(next);
  },
);
