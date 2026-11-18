import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { ACCESS_TYPES, MODULES, STATUS } from '../Config/constant';
import { users } from '../Database/Schema';
import { UserController } from '../Controllers/users';
import { checkAccess, checkOptionsAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { validateUnique } from '../Middleware/validator';
import {
  listValidation,
  loginValidation,
  optionsValidation,
  passwordValidation,
} from '../Utils/validations';
import { registerActivityRoute } from '../Utils/register_activity_route';

export const router = Router();
const controller = new UserController();
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.handler.tooManyRequests(),
});
const recoveryLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.handler.tooManyRequests(),
});

const userRead = checkAccess(MODULES.USER, ACCESS_TYPES.READ);
const userOptions = checkOptionsAccess(MODULES.USER);
const userWrite = checkAccess(MODULES.USER, ACCESS_TYPES.WRITE);
const userDelete = checkAccess(MODULES.USER, ACCESS_TYPES.DELETE);
const roleRead = checkAccess(MODULES.ROLE, ACCESS_TYPES.READ);
const roleWrite = checkAccess(MODULES.ROLE, ACCESS_TYPES.WRITE);
const roleDelete = checkAccess(MODULES.ROLE, ACCESS_TYPES.DELETE);

router.post(
  '/login',
  loginLimiter,
  decryptPayload,
  validate(loginValidation),
  controller.login.bind(controller),
);
router.post(
  '/refresh/token',
  loginLimiter,
  decryptPayload,
  validate([body('refresh_token').isString().notEmpty()]),
  controller.refresh.bind(controller),
);
router.post(
  '/forgot/password',
  recoveryLimiter,
  decryptPayload,
  validate([body('email').isEmail().normalizeEmail()]),
  controller.forgotPassword.bind(controller),
);
router.post(
  '/forgot/otp/verify',
  recoveryLimiter,
  decryptPayload,
  validate([body('otp').isLength({ min: 6, max: 6 }), body('otp_reference').isString().notEmpty()]),
  controller.verifyOtp.bind(controller),
);
router.put(
  '/reset/password',
  recoveryLimiter,
  decryptPayload,
  validate([body('reset_token').isString().notEmpty(), ...passwordValidation]),
  controller.resetPassword.bind(controller),
);
router.get('/profile', decryptPayload, userAuth, userRead, controller.profile.bind(controller));
router.put(
  '/profile/update',
  decryptPayload,
  userAuth,
  userWrite,
  validate([
    body('first_name').optional().isString().trim().notEmpty(),
    body('last_name').optional().isString().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
  ]),
  controller.updateProfile.bind(controller),
);
router.put(
  '/change/password',
  decryptPayload,
  userAuth,
  userWrite,
  validate([body('current_password').isString().notEmpty(), ...passwordValidation]),
  controller.changePassword.bind(controller),
);
router.delete('/logout', decryptPayload, userAuth, userWrite, controller.logout.bind(controller));

router.post(
  '/add',
  decryptPayload,
  userAuth,
  userWrite,
  roleWrite,
  validate([
    body('role_id').isInt({ min: 1 }),
    body('first_name').isString().trim().notEmpty(),
    body('last_name').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    validateUnique(
      async (email) => Boolean(await users.findOne({ where: { email, status: STATUS.ACTIVE } })),
      'email',
    ),
    body('password').isString().isLength({ min: 12 }),
  ]),
  controller.addUser.bind(controller),
);
router.put(
  '/update',
  decryptPayload,
  userAuth,
  userWrite,
  roleWrite,
  validate([
    body('id').isInt({ min: 1 }),
    body('role_id').optional().isInt({ min: 1 }),
    body('first_name').optional().isString().trim().notEmpty(),
    body('last_name').optional().isString().trim().notEmpty(),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .custom(async (email, { req }) => {
        const existing = await users.findOne({
          where: { email, id: { [Op.ne]: Number(req.body.id) }, status: STATUS.ACTIVE },
        });
        if (existing) throw new AppError(409, 'Email already exists in our system.');
      }),
  ]),
  controller.update.bind(controller),
);
router.get(
  '/get/:id',
  decryptPayload,
  userAuth,
  userRead,
  roleRead,
  validate([param('id').isInt({ min: 1 })]),
  controller.get.bind(controller),
);
router.post(
  '/list',
  decryptPayload,
  userAuth,
  userRead,
  roleRead,
  validate(listValidation),
  controller.list.bind(controller),
);
router.post(
  '/options',
  decryptPayload,
  userAuth,
  userOptions,
  validate(optionsValidation),
  controller.options.bind(controller),
);
router.delete(
  '/delete/:id',
  decryptPayload,
  userAuth,
  userDelete,
  roleDelete,
  validate([param('id').isInt({ min: 1 })]),
  controller.delete.bind(controller),
);

registerActivityRoute({
  router,
  payloadDecrypt: decryptPayload,
  userAuth,
  checkAccess: [userRead, roleRead],
  module: MODULES.USER,
});
