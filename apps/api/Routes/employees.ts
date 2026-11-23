import { Router } from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, checkOptionsAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate, validateUnique } from '../Middleware/validator';
import { listValidation, optionsValidation } from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';
import { EmployeeController } from '../Controllers/employees';
import { employees, users } from '../Database/Schema';
import { validatePhoneNumber } from '@hm/shared';

export const employeeRouter = Router();
const employee = new EmployeeController();

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = /\.(csv|xlsx)$/i.test(file.originalname);
    callback(null, allowed);
  },
});

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
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const result = validatePhoneNumber(value, 'IN');
      if (!result.valid) {
        throw new Error(result.error || 'Invalid phone number format');
      }
      req.body.phone = result.e164;
      return true;
    }),
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
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value, { req }) => {
        const result = validatePhoneNumber(value, 'IN');
        if (!result.valid) {
          throw new Error(result.error || 'Invalid phone number format');
        }
        req.body.phone = result.e164;
        return true;
      }),
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
