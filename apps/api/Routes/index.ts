import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES, RESOURCE_MODULES } from '../Config/constant';
import { checkAccess, checkOptionsAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { validateUnique } from '../Middleware/validator';
import { listValidation, optionsValidation } from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';
import { AuditController, EmployeeController, resourceControllers } from '../Controllers/resources';
import { RoleController as RoleResourceController } from '../Controllers/resources';
import { ResourceController } from '../Controllers/resources';
import { employees, users } from '../Database/Schema';

export const router = Router();
const employee = new EmployeeController();
const audit = new AuditController();
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = /\.(csv|xlsx)$/i.test(file.originalname);
    callback(null, allowed);
  },
});

type ResourceName = keyof typeof RESOURCE_MODULES;
const requiredFields: Partial<Record<ResourceName, string[]>> = {
  role: ['name', 'type'],
  module: ['name'],
  permission: ['role_id', 'module_id'],
  department: ['name'],
  designation: ['name'],
  location: ['name'],
  vendor: ['name'],
  asset_category: ['name'],
};

function registerResource(name: ResourceName, resource: ResourceController): void {
  const subrouter = Router();
  const readAccess = checkAccess(RESOURCE_MODULES[name], ACCESS_TYPES.READ);
  const optionsAccess = checkOptionsAccess(RESOURCE_MODULES[name]);
  const writeAccess = checkAccess(RESOURCE_MODULES[name], ACCESS_TYPES.WRITE);
  const deleteAccess = checkAccess(RESOURCE_MODULES[name], ACCESS_TYPES.DELETE);

  const createValidation = (requiredFields[name] ?? []).map((field) =>
    body(field)
      .custom((value) =>
        typeof value === 'string'
          ? value.trim().length > 0
          : value !== null && value !== undefined && value !== '',
      )
      .withMessage(`${field} is required.`),
  );
  const updateValidation = (requiredFields[name] ?? []).map((field) =>
    body(field)
      .optional()
      .custom((value) => typeof value !== 'string' || value.trim().length > 0)
      .withMessage(`${field} cannot be empty.`),
  );
  subrouter.post(
    '/add',
    decryptPayload,
    userAuth,
    writeAccess,
    validate(createValidation),
    resource.add.bind(resource),
  );
  subrouter.put(
    '/update',
    decryptPayload,
    userAuth,
    writeAccess,
    validate([body('id').isInt({ min: 1 }), ...updateValidation]),
    resource.update.bind(resource),
  );
  subrouter.get(
    '/get/:id',
    decryptPayload,
    userAuth,
    readAccess,
    validate([param('id').isInt({ min: 1 })]),
    resource.get.bind(resource),
  );
  subrouter.post(
    '/list',
    decryptPayload,
    userAuth,
    readAccess,
    validate(listValidation),
    resource.list.bind(resource),
  );
  subrouter.post(
    '/options',
    decryptPayload,
    userAuth,
    optionsAccess,
    validate(optionsValidation),
    resource.options.bind(resource),
  );
  subrouter.delete(
    '/delete/:id',
    decryptPayload,
    userAuth,
    deleteAccess,
    validate([param('id').isInt({ min: 1 })]),
    resource.delete.bind(resource),
  );
  registerActivityRoute({
    router: subrouter,
    payloadDecrypt: decryptPayload,
    userAuth,
    checkAccess: readAccess,
    module: RESOURCE_MODULES[name],
  });
  router.use(`/${name}`, subrouter);
}

for (const name of [
  'role',
  'module',
  'permission',
  'department',
  'designation',
  'location',
  'vendor',
  'asset_category',
] as const) {
  registerResource(name, resourceControllers[name]);
}

const roleRouter = Router();
const roleController = resourceControllers.role as RoleResourceController;
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
router.use('/role', roleRouter);
router.get(
  '/module/permission',
  decryptPayload,
  userAuth,
  checkAccess(MODULES.USER, ACCESS_TYPES.READ),
  (resourceControllers.role as RoleResourceController).getCurrentPermissions.bind(
    resourceControllers.role,
  ),
);

const employeeRouter = Router();
const employeeRead = checkAccess(MODULES.EMPLOYEE, ACCESS_TYPES.READ);
const employeeOptions = checkOptionsAccess(MODULES.EMPLOYEE);
const employeeWrite = checkAccess(MODULES.EMPLOYEE, ACCESS_TYPES.WRITE);
const employeeDelete = checkAccess(MODULES.EMPLOYEE, ACCESS_TYPES.DELETE);
const employeeAddValidation = [
  body('employee_code').isString().trim().notEmpty(),
  validateUnique(
    async (employeeCode) =>
      Boolean(
        await employees.findOne({
          where: { employee_code: employeeCode },
        }),
      ),
    'employee_code',
  ),
  body('first_name').isString().trim().notEmpty(),
  body('last_name').isString().trim().notEmpty(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .custom(async (email, { req }) => {
      if (req.body.create_login !== true) return true;
      const existing = await users.findOne({ where: { email, status: 1 } });
      if (existing) throw new Error('Email already belongs to an active user.');
      return true;
    }),
  body('create_login').optional().isBoolean().toBoolean(),
  body('login_password')
    .if((value, { req }) => req.body.create_login === true)
    .isLength({ min: 12 }),
  body('employment_status').optional().isInt({ min: 1, max: 4 }).toInt(),
];
employeeRouter.post(
  '/add',
  decryptPayload,
  userAuth,
  employeeWrite,
  validate(employeeAddValidation),
  employee.add.bind(employee),
);
employeeRouter.put(
  '/update',
  decryptPayload,
  userAuth,
  employeeWrite,
  validate([
    body('id').isInt({ min: 1 }),
    body('employment_status').optional().isInt({ min: 1, max: 4 }),
  ]),
  employee.update.bind(employee),
);
employeeRouter.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  employeeRead,
  validate([param('id').isInt({ min: 1 })]),
  employee.get.bind(employee),
);
employeeRouter.post(
  '/list',
  decryptPayload,
  userAuth,
  employeeRead,
  validate(listValidation),
  employee.list.bind(employee),
);
employeeRouter.post(
  '/options',
  decryptPayload,
  userAuth,
  employeeOptions,
  validate(optionsValidation),
  employee.options.bind(employee),
);
employeeRouter.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  employeeDelete,
  validate([param('id').isInt({ min: 1 })]),
  employee.delete.bind(employee),
);
employeeRouter.post(
  '/bulk/import',
  decryptPayload,
  userAuth,
  employeeWrite,
  fileUpload.single('file'),
  employee.bulkImport.bind(employee),
);
registerActivityRoute({
  router: employeeRouter,
  payloadDecrypt: decryptPayload,
  userAuth,
  checkAccess: employeeRead,
  module: MODULES.EMPLOYEE,
});
router.use('/employee', employeeRouter);

const auditRead = checkAccess(MODULES.AUDIT_LOG, ACCESS_TYPES.READ);
router.post(
  '/audit/list',
  decryptPayload,
  userAuth,
  auditRead,
  validate(listValidation),
  audit.list.bind(audit),
);
router.get('/audit/export', decryptPayload, userAuth, auditRead, audit.export.bind(audit));

import { phase2Router } from './phase2';
router.use(phase2Router);

import { phase3Router } from './phase3';
router.use(phase3Router);

import { phase4Router } from './requests';
router.use(phase4Router);

import { offboardingRouter, portalOffboardingRouter } from './offboarding';
import { offboardingTemplateRouter } from './offboarding_template';
router.use('/offboarding/template', offboardingTemplateRouter);
router.use('/offboarding', offboardingRouter);
router.use('/portal', portalOffboardingRouter);
