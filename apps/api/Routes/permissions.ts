import { MODULES } from '../Config/constant';
import { PermissionController } from '../Controllers/permissions';
import { createResourceRouter } from '../Utils/route_factory';

export const permissionRouter = createResourceRouter(
  MODULES.PERMISSION,
  new PermissionController(),
  ['role_id', 'module_id'],
);
