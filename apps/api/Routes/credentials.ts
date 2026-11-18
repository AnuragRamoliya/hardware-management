import { Router } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, checkOptionsAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation, optionsValidation } from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';
import { CredentialsController, PortalCredentialsController } from '../Controllers/credentials';
import { routeHandler } from '../Utils/route_handler';

const controller = new CredentialsController();
const portalController = new PortalCredentialsController();

// Permissions
const credRead = checkAccess(MODULES.CREDENTIAL, ACCESS_TYPES.READ);
const credWrite = checkAccess(MODULES.CREDENTIAL, ACCESS_TYPES.WRITE);
const credDelete = checkAccess(MODULES.CREDENTIAL, ACCESS_TYPES.DELETE);
const credApprove = checkAccess(MODULES.CREDENTIAL, ACCESS_TYPES.APPROVE);
const credReveal = checkAccess(MODULES.CREDENTIAL, ACCESS_TYPES.REVEAL);
const credOptions = checkOptionsAccess(MODULES.CREDENTIAL);

const typeRead = checkAccess(MODULES.CREDENTIAL_TYPE, ACCESS_TYPES.READ);
const typeWrite = checkAccess(MODULES.CREDENTIAL_TYPE, ACCESS_TYPES.WRITE);
const typeDelete = checkAccess(MODULES.CREDENTIAL_TYPE, ACCESS_TYPES.DELETE);
const typeOptions = checkOptionsAccess(MODULES.CREDENTIAL_TYPE);

const auditRead = checkAccess(MODULES.CREDENTIAL_ACCESS_LOG, ACCESS_TYPES.READ);

// Credential Types Routes
const typeRouter = Router();
typeRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  typeRead,
  validate(listValidation),
  routeHandler((req) => controller.listTypes(req)),
);
typeRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  typeRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.getType(req)),
);
typeRouter.post(
  '/add',
  decryptPayload,
  userAuth,
  typeWrite,
  validate([
    body('name').isString().trim().notEmpty(),
    body('category').isString().trim().notEmpty(),
  ]),
  routeHandler((req) => controller.addType(req), true),
);
typeRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  typeWrite,
  validate([body('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.updateType(req)),
);
typeRouter.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  typeDelete,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.deleteType(req)),
);
typeRouter.post(
  '/options',
  decryptPayload,
  userAuth,
  typeOptions,
  validate(optionsValidation),
  routeHandler(() => controller.optionsTypes()),
);
registerActivityRoute({
  router: typeRouter,
  payloadDecrypt: decryptPayload,
  userAuth,
  checkAccess: typeRead,
  module: MODULES.CREDENTIAL_TYPE,
});

// Credentials Admin Routes
const credRouter = Router();
credRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  credRead,
  validate(listValidation),
  routeHandler((req) => controller.list(req)),
);
credRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  credRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.get(req)),
);
credRouter.post(
  '/add',
  decryptPayload,
  userAuth,
  credWrite,
  validate([
    body('employee_id').isInt({ min: 1 }).toInt(),
    body('credential_type_id').isInt({ min: 1 }).toInt(),
    body('label').isString().trim().notEmpty(),
    body('username').isString().trim().notEmpty(),
    body('password').isString().notEmpty(),
  ]),
  routeHandler((req) => controller.add(req), true),
);
credRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  credWrite,
  validate([body('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.update(req)),
);
credRouter.put(
  '/change-password',
  decryptPayload,
  userAuth,
  credWrite,
  validate([body('id').isInt({ min: 1 }).toInt(), body('password').isString().notEmpty()]),
  routeHandler((req) => controller.changePassword(req)),
);
credRouter.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  credDelete,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.delete(req)),
);
credRouter.post(
  '/options',
  decryptPayload,
  userAuth,
  credOptions,
  validate(optionsValidation),
  routeHandler(() => controller.optionsTypes()),
);
credRouter.get(
  '/history/:id',
  decryptPayload,
  userAuth,
  credRead,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.history(req)),
);

// Approvals Queue
credRouter.post(
  '/approvals/list',
  decryptPayload,
  userAuth,
  credApprove,
  validate(listValidation),
  routeHandler((req) => controller.approvalsList(req)),
);
credRouter.post(
  '/approve/:id',
  decryptPayload,
  userAuth,
  credApprove,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.approve(req)),
);
credRouter.post(
  '/reject/:id',
  decryptPayload,
  userAuth,
  credApprove,
  validate([
    param('id').isInt({ min: 1 }).toInt(),
    body('feedback').isString().trim().isLength({ min: 3 }),
  ]),
  routeHandler((req) => controller.reject(req)),
);
credRouter.post(
  '/needs-change/:id',
  decryptPayload,
  userAuth,
  credApprove,
  validate([
    param('id').isInt({ min: 1 }).toInt(),
    body('feedback').isString().trim().isLength({ min: 3 }),
  ]),
  routeHandler((req) => controller.needsChange(req)),
);
credRouter.post(
  '/bulk/approve',
  decryptPayload,
  userAuth,
  credApprove,
  validate([body('ids').isArray({ min: 1 })]),
  routeHandler((req) => controller.bulkApprove(req)),
);

// Reveal
credRouter.post(
  '/reveal/:id',
  decryptPayload,
  userAuth,
  credReveal,
  validate([
    param('id').isInt({ min: 1 }).toInt(),
    body('reauth_token').isString().notEmpty(),
    body('reason').isString().trim().isLength({ min: 5 }),
  ]),
  routeHandler((req) => controller.reveal(req)),
);

// Collection Requests
credRouter.post(
  '/request/create',
  decryptPayload,
  userAuth,
  credWrite,
  validate([
    body('employee_id').isInt({ min: 1 }).toInt(),
    body('credential_type_id').isInt({ min: 1 }).toInt(),
    body('due_date').isString().notEmpty(),
  ]),
  routeHandler((req) => controller.createRequest(req), true),
);
credRouter.post(
  '/request/list',
  decryptPayload,
  userAuth,
  credRead,
  validate(listValidation),
  routeHandler((req) => controller.listRequests(req)),
);
credRouter.post(
  '/request/cancel/:id',
  decryptPayload,
  userAuth,
  credWrite,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => controller.cancelRequest(req)),
);

// Access Logs & Audit
credRouter.post(
  '/audit/list',
  decryptPayload,
  userAuth,
  auditRead,
  validate(listValidation),
  routeHandler((req) => controller.accessLogsList(req)),
);
credRouter.get('/audit/export', decryptPayload, userAuth, auditRead, (req, res) =>
  controller.accessLogsExport(req, res),
);
credRouter.post(
  '/audit/verify',
  decryptPayload,
  userAuth,
  auditRead,
  routeHandler(() => controller.auditVerify()),
);

registerActivityRoute({
  router: credRouter,
  payloadDecrypt: decryptPayload,
  userAuth,
  checkAccess: credRead,
  module: MODULES.CREDENTIAL,
});

// Portal Credential Routes (Employee Self-Service)
const portalCredRouter = Router();
portalCredRouter.get(
  '/consent/status',
  decryptPayload,
  userAuth,
  routeHandler((req) => portalController.consentStatus(req)),
);
portalCredRouter.post(
  '/consent',
  decryptPayload,
  userAuth,
  routeHandler((req) => portalController.acceptConsent(req)),
);
portalCredRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  validate(listValidation),
  routeHandler((req) => portalController.list(req)),
);
portalCredRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => portalController.get(req)),
);
portalCredRouter.post(
  '/add',
  decryptPayload,
  userAuth,
  validate([
    body('credential_type_id').isInt({ min: 1 }).toInt(),
    body('label').isString().trim().notEmpty(),
    body('username').isString().trim().notEmpty(),
    body('password').isString().notEmpty(),
  ]),
  routeHandler((req) => portalController.add(req), true),
);
portalCredRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  validate([body('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => portalController.update(req)),
);
portalCredRouter.put(
  '/change-password',
  decryptPayload,
  userAuth,
  validate([body('id').isInt({ min: 1 }).toInt(), body('password').isString().notEmpty()]),
  routeHandler((req) => portalController.changePassword(req)),
);
portalCredRouter.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt()]),
  routeHandler((req) => portalController.delete(req)),
);
portalCredRouter.post(
  '/reveal/:id',
  decryptPayload,
  userAuth,
  validate([param('id').isInt({ min: 1 }).toInt(), body('reauth_token').isString().notEmpty()]),
  routeHandler((req) => portalController.reveal(req)),
);
portalCredRouter.get(
  '/requests',
  decryptPayload,
  userAuth,
  routeHandler((req) => portalController.myRequests(req)),
);
portalCredRouter.get(
  '/types',
  decryptPayload,
  userAuth,
  routeHandler(() => portalController.allowedTypes()),
);

export const phase3Router = Router();
phase3Router.use('/credential-type', typeRouter);
phase3Router.use('/credential', credRouter);
phase3Router.use('/portal/credential', portalCredRouter);
