import { assetAssignmentsSchema } from './asset_assignments';
import { assetMaintenanceSchema } from './asset_maintenance';
import { assetsSchema } from './assets';
import { notificationsSchema } from './notifications';
import { softwareAssignmentsSchema } from './software_assignments';
import { softwareLicensesSchema } from './software_licenses';
import { softwareSchema } from './software';

export const phase2Schemas = {
  notifications: notificationsSchema,
  assets: assetsSchema,
  asset_assignments: assetAssignmentsSchema,
  asset_maintenance: assetMaintenanceSchema,
  software: softwareSchema,
  software_licenses: softwareLicensesSchema,
  software_assignments: softwareAssignmentsSchema,
};
