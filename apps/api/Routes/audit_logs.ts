import { Router } from 'express';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { listValidation } from '../Utils/validations';
import { AuditController } from '../Controllers/audit_logs';

export const auditRouter = Router();
const audit = new AuditController();
const auditRead = checkAccess(MODULES.AUDIT_LOG, ACCESS_TYPES.READ);

auditRouter.post(
  '/audit/list',
  decryptPayload,
  userAuth,
  auditRead,
  validate(listValidation),
  audit.list.bind(audit),
);

auditRouter.get('/audit/export', decryptPayload, userAuth, auditRead, audit.export.bind(audit));

auditRouter.get('/audit/modules', decryptPayload, userAuth, auditRead, audit.modules.bind(audit));
