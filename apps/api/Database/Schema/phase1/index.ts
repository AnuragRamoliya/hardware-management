import { rolesSchema } from './roles';
import { modulesSchema } from './modules';
import { permissionsSchema } from './permissions';
import { usersSchema, userTokensSchema } from './users';
import { activityLogsSchema, appSettingsSchema } from './activity_logs';
import { departmentsSchema } from './departments';
import { designationsSchema } from './designations';
import { locationsSchema } from './locations';
import { vendorsSchema } from './vendors';
import { assetCategoriesSchema } from './asset_categories';
import { employeesSchema } from './employees';

export const phase1Schemas = {
  roles: rolesSchema,
  modules: modulesSchema,
  permissions: permissionsSchema,
  users: usersSchema,
  user_tokens: userTokensSchema,
  activity_logs: activityLogsSchema,
  app_settings: appSettingsSchema,
  departments: departmentsSchema,
  designations: designationsSchema,
  locations: locationsSchema,
  vendors: vendorsSchema,
  asset_categories: assetCategoriesSchema,
  employees: employeesSchema,
};
