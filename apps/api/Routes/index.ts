import { Router } from 'express';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';

// Phase 1 Modular Routers
import { departmentRouter } from './department';
import { designationRouter } from './designation';
import { locationRouter } from './location';
import { vendorRouter } from './vendor';
import { assetCategoryRouter } from './asset_category';
import { roleRouter, roleController } from './roles';
import { moduleRouter } from './modules';
import { permissionRouter } from './permissions';
import { employeeRouter } from './employees';
import { auditRouter } from './audit_logs';

// Phase 2, 3, 4, 5 Routers
import { phase2Router } from './phase2';
import { phase3Router } from './phase3';
import { phase4Router } from './requests';
import { offboardingRouter, portalOffboardingRouter } from './offboarding';
import { offboardingTemplateRouter } from './offboarding_template';

export const router = Router();

// Phase 1 Resources
router.use('/department', departmentRouter);
router.use('/designation', designationRouter);
router.use('/location', locationRouter);
router.use('/vendor', vendorRouter);
router.use('/asset_category', assetCategoryRouter);
router.use('/role', roleRouter);
router.use('/module', moduleRouter);
router.use('/permission', permissionRouter);
router.use('/employee', employeeRouter);
router.use(auditRouter);

// Current user module permissions endpoint (used by navigation and frontend RBAC)
router.get(
  '/module/permission',
  decryptPayload,
  userAuth,
  checkAccess(MODULES.USER, ACCESS_TYPES.READ),
  roleController.getCurrentPermissions.bind(roleController),
);

// Phase 2: Assets, Software, Maintenance, Notifications, Dashboard
router.use(phase2Router);

// Phase 3: Credentials Vault
router.use(phase3Router);

// Phase 4: Requests Workflow
router.use(phase4Router);

// Phase 5: Offboarding
router.use('/offboarding/template', offboardingTemplateRouter);
router.use('/offboarding', offboardingRouter);
router.use('/portal', portalOffboardingRouter);
