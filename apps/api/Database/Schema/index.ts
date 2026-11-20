import { DataTypes, Model, type ModelAttributes, type ModelStatic } from 'sequelize';
import { sequelize } from '../../Config/database';

import { rolesSchema } from './roles';
import { modulesSchema } from './modules';
import { permissionsSchema } from './permissions';
import { usersSchema } from './users';
import { userTokensSchema } from './user_tokens';
import { activityLogsSchema } from './activity_logs';
import { appSettingsSchema } from './app_settings';
import { departmentsSchema } from './departments';
import { designationsSchema } from './designations';
import { locationsSchema } from './locations';
import { vendorsSchema } from './vendors';
import { assetCategoriesSchema } from './asset_categories';
import { employeesSchema } from './employees';
import { notificationsSchema } from './notifications';
import { notificationPreferencesSchema } from './notification_preferences';
import { assetsSchema } from './assets';
import { assetAssignmentsSchema } from './asset_assignments';
import { assetMaintenanceSchema } from './asset_maintenance';
import { softwareSchema } from './software';
import { softwareLicensesSchema } from './software_licenses';
import { softwareAssignmentsSchema } from './software_assignments';
import { credentialTypesSchema } from './credential_types';
import { credentialsSchema } from './credentials';
import { credentialHistorySchema } from './credential_history';
import { credentialCollectionRequestsSchema } from './credential_collection_requests';
import { credentialAccessLogsSchema } from './credential_access_logs';
import { loginHistorySchema } from './login_history';
import { requestsSchema } from './requests';
import { requestCommentsSchema } from './request_comments';
import { requestStatusHistorySchema } from './request_status_history';
import { requestAttachmentsSchema } from './request_attachments';
import { offboardingChecklistTemplatesSchema } from './offboarding_checklist_templates';
import { offboardingCasesSchema } from './offboarding_cases';
import { offboardingTasksSchema } from './offboarding_tasks';
import { exportJobsSchema } from './export_jobs';

export type RowAttributes = Record<string, unknown>;
export type EntityModel = ModelStatic<Model<RowAttributes, RowAttributes>>;

const commonAttributes = {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
  status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false },
};

const schemas = {
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
  notifications: notificationsSchema,
  notification_preferences: notificationPreferencesSchema,
  assets: assetsSchema,
  asset_assignments: assetAssignmentsSchema,
  asset_maintenance: assetMaintenanceSchema,
  software: softwareSchema,
  software_licenses: softwareLicensesSchema,
  software_assignments: softwareAssignmentsSchema,
  credential_types: credentialTypesSchema,
  credentials: credentialsSchema,
  credential_history: credentialHistorySchema,
  credential_collection_requests: credentialCollectionRequestsSchema,
  credential_access_logs: credentialAccessLogsSchema,
  login_history: loginHistorySchema,
  requests: requestsSchema,
  request_comments: requestCommentsSchema,
  request_status_history: requestStatusHistorySchema,
  request_attachments: requestAttachmentsSchema,
  offboarding_checklist_templates: offboardingChecklistTemplatesSchema,
  offboarding_cases: offboardingCasesSchema,
  offboarding_tasks: offboardingTasksSchema,
  export_jobs: exportJobsSchema,
};

function defineModel(tableName: string, attributes: Record<string, object>): EntityModel {
  const definition = { ...attributes, ...commonAttributes } as ModelAttributes<
    Model<RowAttributes, RowAttributes>,
    RowAttributes
  >;

  let defaultScope: { attributes?: { exclude: string[] } } | undefined;
  if (tableName === 'users') {
    defaultScope = { attributes: { exclude: ['password'] } };
  } else if (tableName === 'credentials') {
    // Strictly exclude password fields and encryption materials by default!
    defaultScope = { attributes: { exclude: ['password_enc', 'iv', 'auth_tag', 'key_version'] } };
  }

  return sequelize.define<Model<RowAttributes, RowAttributes>>(tableName, definition, {
    tableName,
    timestamps: true,
    ...(defaultScope ? { defaultScope } : {}),
    scopes:
      tableName === 'credentials'
        ? {
            withSecret: {
              attributes: { include: ['password_enc', 'iv', 'auth_tag', 'key_version'] },
            },
          }
        : undefined,
  });
}

export const models = Object.fromEntries(
  Object.entries(schemas).map(([name, attributes]) => [name, defineModel(name, attributes)]),
) as { [Key in keyof typeof schemas]: EntityModel };

export const roles = models.roles;
export const modules = models.modules;
export const permissions = models.permissions;
export const users = models.users;
export const user_tokens = models.user_tokens;
export const activity_logs = models.activity_logs;
export const app_settings = models.app_settings;
export const departments = models.departments;
export const designations = models.designations;
export const locations = models.locations;
export const vendors = models.vendors;
export const asset_categories = models.asset_categories;
export const employees = models.employees;
export const notifications = models.notifications;
export const notification_preferences = models.notification_preferences;
export const assets = models.assets;
export const asset_assignments = models.asset_assignments;
export const asset_maintenance = models.asset_maintenance;
export const software = models.software;
export const software_licenses = models.software_licenses;
export const software_assignments = models.software_assignments;
export const credential_types = models.credential_types;
export const credentials = models.credentials;
export const credential_history = models.credential_history;
export const credential_collection_requests = models.credential_collection_requests;
export const credential_access_logs = models.credential_access_logs;
export const login_history = models.login_history;
export const requests = models.requests;
export const request_comments = models.request_comments;
export const request_status_history = models.request_status_history;
export const request_attachments = models.request_attachments;
export const offboarding_checklist_templates = models.offboarding_checklist_templates;
export const offboarding_cases = models.offboarding_cases;
export const offboarding_tasks = models.offboarding_tasks;
export const export_jobs = models.export_jobs;

// Associations
roles.hasMany(permissions, { foreignKey: 'role_id', as: 'permissions' });
permissions.belongsTo(roles, { foreignKey: 'role_id' });
modules.hasMany(permissions, { foreignKey: 'module_id', as: 'permissions' });
permissions.belongsTo(modules, { foreignKey: 'module_id' });
roles.hasMany(users, { foreignKey: 'role_id', as: 'users' });
users.belongsTo(roles, { foreignKey: 'role_id', as: 'role' });
notifications.belongsTo(users, { foreignKey: 'recipient_user_id', as: 'recipient' });
users.hasMany(notifications, { foreignKey: 'recipient_user_id', as: 'notifications' });
notification_preferences.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
users.hasMany(notification_preferences, { foreignKey: 'user_id', as: 'notification_preferences' });
users.hasMany(user_tokens, { foreignKey: 'user_id', as: 'tokens' });
user_tokens.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
employees.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
employees.belongsTo(departments, { foreignKey: 'department_id', as: 'department' });
departments.hasMany(employees, { foreignKey: 'department_id', as: 'employees' });
employees.belongsTo(designations, { foreignKey: 'designation_id', as: 'designation' });
designations.hasMany(employees, { foreignKey: 'designation_id', as: 'employees' });
employees.belongsTo(locations, { foreignKey: 'location_id', as: 'location' });
locations.hasMany(employees, { foreignKey: 'location_id', as: 'employees' });
employees.belongsTo(employees, { foreignKey: 'manager_id', as: 'manager' });

export { sequelize };

assets.belongsTo(asset_categories, { foreignKey: 'category_id', as: 'category' });
asset_categories.hasMany(assets, { foreignKey: 'category_id', as: 'assets' });
assets.belongsTo(vendors, { foreignKey: 'vendor_id', as: 'vendor' });
assets.belongsTo(locations, { foreignKey: 'location_id', as: 'location' });
assets.belongsTo(assets, { foreignKey: 'parent_asset_id', as: 'parent' });
assets.hasMany(assets, { foreignKey: 'parent_asset_id', as: 'accessories' });
assets.hasMany(asset_assignments, { foreignKey: 'asset_id', as: 'assignments' });
asset_assignments.belongsTo(assets, { foreignKey: 'asset_id', as: 'asset' });
asset_assignments.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });
assets.hasMany(asset_maintenance, { foreignKey: 'asset_id', as: 'maintenance' });
asset_maintenance.belongsTo(assets, { foreignKey: 'asset_id', as: 'asset' });
software.belongsTo(vendors, { foreignKey: 'vendor_id', as: 'vendor' });
software.hasMany(software_licenses, { foreignKey: 'software_id', as: 'licenses' });
software_licenses.belongsTo(software, { foreignKey: 'software_id', as: 'software' });
software.hasMany(software_assignments, { foreignKey: 'software_id', as: 'assignments' });
software_assignments.belongsTo(software, { foreignKey: 'software_id', as: 'software' });
software_assignments.belongsTo(software_licenses, { foreignKey: 'license_id', as: 'license' });
software_assignments.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });

// Credentials Associations
credentials.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });
credentials.belongsTo(credential_types, {
  foreignKey: 'credential_type_id',
  as: 'credential_type',
});
credentials.belongsTo(software, { foreignKey: 'software_id', as: 'software' });
credentials.belongsTo(assets, { foreignKey: 'asset_id', as: 'asset' });
credentials.belongsTo(users, { foreignKey: 'reviewed_by', as: 'reviewer' });
credentials.hasMany(credential_history, { foreignKey: 'credential_id', as: 'history' });
credentials.hasMany(credential_access_logs, { foreignKey: 'credential_id', as: 'access_logs' });
credential_history.belongsTo(credentials, { foreignKey: 'credential_id', as: 'credential' });
credential_history.belongsTo(users, { foreignKey: 'changed_by', as: 'user' });

credential_collection_requests.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });
credential_collection_requests.belongsTo(credential_types, {
  foreignKey: 'credential_type_id',
  as: 'credential_type',
});
credential_collection_requests.belongsTo(users, { foreignKey: 'requested_by', as: 'requester' });
credential_collection_requests.belongsTo(credentials, {
  foreignKey: 'credential_id',
  as: 'credential',
});

credential_access_logs.belongsTo(credentials, { foreignKey: 'credential_id', as: 'credential' });
credential_access_logs.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });
credential_access_logs.belongsTo(users, { foreignKey: 'accessed_by', as: 'accessor' });

login_history.belongsTo(users, { foreignKey: 'user_id', as: 'user' });

// Requests Associations
requests.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });
requests.belongsTo(asset_categories, { foreignKey: 'category_id', as: 'category' });
requests.belongsTo(assets, { foreignKey: 'current_asset_id', as: 'current_asset' });
requests.belongsTo(software, { foreignKey: 'software_id', as: 'software' });
requests.belongsTo(users, { foreignKey: 'assigned_to', as: 'assignee' });
requests.belongsTo(users, { foreignKey: 'reviewed_by', as: 'reviewer' });
requests.belongsTo(assets, { foreignKey: 'assigned_asset_id', as: 'assigned_asset' });
requests.belongsTo(software_licenses, {
  foreignKey: 'assigned_license_id',
  as: 'assigned_license',
});
requests.belongsTo(users, { foreignKey: 'fulfilled_by', as: 'fulfiller' });
requests.hasMany(request_comments, { foreignKey: 'request_id', as: 'comments' });
requests.hasMany(request_status_history, { foreignKey: 'request_id', as: 'history' });
requests.hasMany(request_attachments, { foreignKey: 'request_id', as: 'attachments' });

request_comments.belongsTo(requests, { foreignKey: 'request_id', as: 'request' });
request_comments.belongsTo(users, { foreignKey: 'user_id', as: 'author' });

request_status_history.belongsTo(requests, { foreignKey: 'request_id', as: 'request' });
request_status_history.belongsTo(users, { foreignKey: 'changed_by', as: 'user' });

request_attachments.belongsTo(requests, { foreignKey: 'request_id', as: 'request' });
request_attachments.belongsTo(users, { foreignKey: 'uploaded_by', as: 'uploader' });

employees.hasMany(requests, { foreignKey: 'employee_id', as: 'requests' });
assets.hasMany(requests, { foreignKey: 'current_asset_id', as: 'linked_requests' });

// Offboarding Associations
offboarding_cases.belongsTo(employees, { foreignKey: 'employee_id', as: 'employee' });
offboarding_cases.belongsTo(users, { foreignKey: 'initiated_by', as: 'initiator' });
offboarding_cases.belongsTo(users, { foreignKey: 'handover_to', as: 'handover_user' });
offboarding_cases.belongsTo(employees, { foreignKey: 'manager_id', as: 'manager' });
offboarding_cases.hasMany(offboarding_tasks, { foreignKey: 'case_id', as: 'tasks' });

offboarding_tasks.belongsTo(offboarding_cases, { foreignKey: 'case_id', as: 'case' });
offboarding_tasks.belongsTo(users, { foreignKey: 'assigned_to', as: 'assignee' });
offboarding_tasks.belongsTo(users, { foreignKey: 'completed_by', as: 'completer' });
offboarding_tasks.belongsTo(users, { foreignKey: 'waived_by', as: 'waiver' });

employees.hasMany(offboarding_cases, { foreignKey: 'employee_id', as: 'offboarding_cases' });
users.hasMany(offboarding_cases, { foreignKey: 'handover_to', as: 'assigned_offboarding_cases' });
users.hasMany(offboarding_tasks, { foreignKey: 'assigned_to', as: 'assigned_offboarding_tasks' });

// Export Jobs Associations
export_jobs.belongsTo(users, { foreignKey: 'requested_by', as: 'requester' });
users.hasMany(export_jobs, { foreignKey: 'requested_by', as: 'export_jobs' });
