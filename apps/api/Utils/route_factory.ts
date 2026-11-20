import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, param } from 'express-validator';
import { ACCESS_TYPES } from '../Config/constant';
import { checkAccess, checkOptionsAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation, optionsValidation } from './validations';
import { registerActivityRoute } from './register_activity_route';

export interface CrudController {
  add: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  get: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  options: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  delete: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export function createResourceRouter(
  moduleName: string,
  controller: CrudController,
  requiredCreateFields: string[] = ['name'],
): Router {
  const router = Router();
  const readAccess = checkAccess(moduleName, ACCESS_TYPES.READ);
  const optionsAccess = checkOptionsAccess(moduleName);
  const writeAccess = checkAccess(moduleName, ACCESS_TYPES.WRITE);
  const deleteAccess = checkAccess(moduleName, ACCESS_TYPES.DELETE);

  const createValidation = requiredCreateFields.map((field) =>
    body(field)
      .custom((value) =>
        typeof value === 'string'
          ? value.trim().length > 0
          : value !== null && value !== undefined && value !== '',
      )
      .withMessage(`${field} is required.`),
  );

  const updateValidation = requiredCreateFields.map((field) =>
    body(field)
      .optional()
      .custom((value) => typeof value !== 'string' || value.trim().length > 0)
      .withMessage(`${field} cannot be empty.`),
  );

  router.post(
    '/add',
    decryptPayload,
    userAuth,
    writeAccess,
    validate(createValidation),
    controller.add.bind(controller),
  );

  router.put(
    '/update',
    decryptPayload,
    userAuth,
    writeAccess,
    validate([body('id').isInt({ min: 1 }), ...updateValidation]),
    controller.update.bind(controller),
  );

  router.get(
    '/get/:id',
    decryptPayload,
    userAuth,
    readAccess,
    validate([param('id').isInt({ min: 1 })]),
    controller.get.bind(controller),
  );

  router.post(
    '/list',
    decryptPayload,
    userAuth,
    readAccess,
    validate(listValidation),
    controller.list.bind(controller),
  );

  router.post(
    '/options',
    decryptPayload,
    userAuth,
    optionsAccess,
    validate(optionsValidation),
    controller.options.bind(controller),
  );

  router.delete(
    '/delete/:id',
    decryptPayload,
    userAuth,
    deleteAccess,
    validate([param('id').isInt({ min: 1 })]),
    controller.delete.bind(controller),
  );

  registerActivityRoute({
    router,
    payloadDecrypt: decryptPayload,
    userAuth,
    checkAccess: readAccess,
    module: moduleName,
  });

  return router;
}
