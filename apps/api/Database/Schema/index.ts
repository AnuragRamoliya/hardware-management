import { DataTypes, Model, type ModelAttributes, type ModelStatic } from 'sequelize';
import { sequelize } from '../../Config/database';
import { phase2Schemas } from './phase2';

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
  roles: {
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    type: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  },
  modules: {
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  permissions: {
    role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    module_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    read_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    write_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    delete_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    options_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  users: {
    role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    first_name: { type: DataTypes.STRING(255), allowNull: false },
    last_name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    image: { type: DataTypes.STRING(255), allowNull: true },
  },
  user_tokens: {
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    token: { type: DataTypes.STRING(512), allowNull: true, unique: true },
    refresh_token_hash: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    refresh_expires_at: { type: DataTypes.DATE, allowNull: true },
    otp: { type: DataTypes.STRING(10), allowNull: true },
    otp_reference: { type: DataTypes.STRING(512), allowNull: true },
    reset_token: { type: DataTypes.STRING(512), allowNull: true },
  },
  activity_logs: {
    module: { type: DataTypes.STRING(100), allowNull: false },
    module_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    action: { type: DataTypes.STRING(40), allowNull: false },
    field: { type: DataTypes.STRING(100), allowNull: true },
    old_value: { type: DataTypes.JSON, allowNull: true },
    new_value: { type: DataTypes.JSON, allowNull: true },
    description: { type: DataTypes.STRING(500), allowNull: false },
    meta: { type: DataTypes.JSON, allowNull: true },
    created_by_name: { type: DataTypes.STRING(255), allowNull: true },
  },
  app_settings: {
    key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  departments: {
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  designations: {
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  locations: {
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    address: { type: DataTypes.TEXT, allowNull: true },
  },
  vendors: {
    name: { type: DataTypes.STRING(255), allowNull: false },
    contact_name: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
  },
  asset_categories: {
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  ...phase2Schemas,
  employees: {
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true },
    employee_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    first_name: { type: DataTypes.STRING(255), allowNull: false },
    last_name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    department_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    designation_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    manager_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    location_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    join_date: { type: DataTypes.DATEONLY, allowNull: true },
    last_working_date: { type: DataTypes.DATEONLY, allowNull: true },
    employment_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
    profile_image: { type: DataTypes.STRING(255), allowNull: true },
  },
};

function defineModel(tableName: string, attributes: Record<string, object>): EntityModel {
  const definition = { ...attributes, ...commonAttributes } as ModelAttributes<
    Model<RowAttributes, RowAttributes>,
    RowAttributes
  >;
  return sequelize.define<Model<RowAttributes, RowAttributes>>(tableName, definition, {
    tableName,
    timestamps: true,
    ...(tableName === 'users' ? { defaultScope: { attributes: { exclude: ['password'] } } } : {}),
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
export const assets = models.assets;
export const asset_assignments = models.asset_assignments;
export const asset_maintenance = models.asset_maintenance;
export const software = models.software;
export const software_licenses = models.software_licenses;
export const software_assignments = models.software_assignments;

roles.hasMany(permissions, { foreignKey: 'role_id', as: 'permissions' });
permissions.belongsTo(roles, { foreignKey: 'role_id' });
modules.hasMany(permissions, { foreignKey: 'module_id', as: 'permissions' });
permissions.belongsTo(modules, { foreignKey: 'module_id' });
roles.hasMany(users, { foreignKey: 'role_id', as: 'users' });
users.belongsTo(roles, { foreignKey: 'role_id', as: 'role' });
users.hasMany(user_tokens, { foreignKey: 'user_id', as: 'tokens' });
user_tokens.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
employees.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
employees.belongsTo(departments, { foreignKey: 'department_id', as: 'department' });
employees.belongsTo(designations, { foreignKey: 'designation_id', as: 'designation' });
employees.belongsTo(locations, { foreignKey: 'location_id', as: 'location' });
employees.belongsTo(employees, { foreignKey: 'manager_id', as: 'manager' });

export { sequelize };

assets.belongsTo(asset_categories, { foreignKey: 'category_id', as: 'category' });
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
