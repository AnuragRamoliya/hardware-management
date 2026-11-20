import { Router } from 'express';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';

// Core Resources
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

// Assets, Software, Inventory & Maintenance Routers
import { assetsRouter } from './assets';
import { assetAssignmentsRouter } from './asset_assignments';
import { assetMaintenanceRouter } from './asset_maintenance';
import { softwareRouter } from './software';
import { softwareLicensesRouter } from './software_licenses';
import { employeeInventoryRouter } from './employee_inventory';
import { portalRouter } from './portal';
import { dashboardRouter } from './dashboard';
import { notificationsRouter } from './notifications';

// Credentials, Requests & Offboarding Routers
import { credentialsRouter } from './credentials';
import { requestsRouter } from './requests';
import { offboardingRouter, portalOffboardingRouter } from './offboarding';
import { offboardingTemplateRouter } from './offboarding_template';

export const router = Router();

// Core Resources
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

// Assets, Software, Maintenance & Dashboard
router.use(assetsRouter);
router.use(assetAssignmentsRouter);
router.use(assetMaintenanceRouter);
router.use(softwareRouter);
router.use(softwareLicensesRouter);
router.use(employeeInventoryRouter);
router.use(portalRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);

// Credentials Vault
router.use(credentialsRouter);

// Requests Workflow
router.use(requestsRouter);

// Offboarding
router.use('/offboarding/template', offboardingTemplateRouter);
router.use('/offboarding', offboardingRouter);
router.use('/portal', portalOffboardingRouter);

// Reports & Exports
import { reportRouter } from './reports';
router.use(reportRouter);
