export { BaseCrudController as ResourceController } from './base_crud.controller';
export { DepartmentController } from './department';
export { DesignationController } from './designation';
export { LocationController } from './location';
export { VendorController } from './vendor';
export { AssetCategoryController } from './asset_category';
export { RoleController } from './roles';
export { ModuleController } from './modules';
export { PermissionController } from './permissions';
export { EmployeeController } from './employees';
export { AuditController } from './audit_logs';

import { DepartmentController } from './department';
import { DesignationController } from './designation';
import { LocationController } from './location';
import { VendorController } from './vendor';
import { AssetCategoryController } from './asset_category';
import { RoleController } from './roles';
import { ModuleController } from './modules';
import { PermissionController } from './permissions';

export const resourceControllers = {
  role: new RoleController(),
  module: new ModuleController(),
  permission: new PermissionController(),
  department: new DepartmentController(),
  designation: new DesignationController(),
  location: new LocationController(),
  vendor: new VendorController(),
  asset_category: new AssetCategoryController(),
};
