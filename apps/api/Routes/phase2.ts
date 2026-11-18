import { Router } from 'express';
import { assetsRouter } from './assets';
import { assetAssignmentsRouter } from './asset_assignments';
import { assetMaintenanceRouter } from './asset_maintenance';
import { softwareRouter } from './software';
import { softwareLicensesRouter } from './software_licenses';
import { employeeInventoryRouter } from './employee_inventory';
import { portalRouter } from './portal';
import { dashboardRouter } from './dashboard';
import { notificationsRouter } from './notifications';

/** Phase 2 route composition. Each domain owns its own router and controller. */
export const phase2Router = Router();
phase2Router.use(assetsRouter);
phase2Router.use(assetAssignmentsRouter);
phase2Router.use(assetMaintenanceRouter);
phase2Router.use(softwareRouter);
phase2Router.use(softwareLicensesRouter);
phase2Router.use(employeeInventoryRouter);
phase2Router.use(portalRouter);
phase2Router.use(dashboardRouter);
phase2Router.use(notificationsRouter);
