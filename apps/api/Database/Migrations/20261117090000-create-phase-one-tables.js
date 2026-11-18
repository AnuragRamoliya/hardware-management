'use strict';

const baseColumns = (Sequelize) => ({
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.BIGINT.UNSIGNED,
  },
  status: {
    allowNull: false,
    defaultValue: 1,
    type: Sequelize.TINYINT.UNSIGNED,
    comment: '0 inactive, 1 active, 2 deleted',
  },
  created_by: { allowNull: true, type: Sequelize.BIGINT.UNSIGNED },
  updated_by: { allowNull: true, type: Sequelize.BIGINT.UNSIGNED },
  createdAt: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updatedAt: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
});

const reference = (table, allowNull = false) => ({
  allowNull,
  type: require('sequelize').BIGINT.UNSIGNED,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const base = baseColumns(Sequelize);
    await queryInterface.createTable('roles', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(100), unique: true },
      type: { allowNull: false, type: Sequelize.STRING(50), unique: true },
    });
    await queryInterface.createTable('modules', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(100), unique: true },
      sortOrder: { allowNull: false, defaultValue: 0, type: Sequelize.INTEGER },
    });
    await queryInterface.createTable('permissions', {
      ...base,
      role_id: reference('roles'),
      module_id: reference('modules'),
      read_access: { allowNull: false, defaultValue: 0, type: Sequelize.TINYINT.UNSIGNED },
      write_access: { allowNull: false, defaultValue: 0, type: Sequelize.TINYINT.UNSIGNED },
      delete_access: { allowNull: false, defaultValue: 0, type: Sequelize.TINYINT.UNSIGNED },
    });
    await queryInterface.addConstraint('permissions', {
      fields: ['role_id', 'module_id'],
      type: 'unique',
      name: 'permissions_role_module_unique',
    });
    await queryInterface.createTable('users', {
      ...base,
      role_id: reference('roles'),
      first_name: { allowNull: false, type: Sequelize.STRING(255) },
      last_name: { allowNull: false, type: Sequelize.STRING(255) },
      email: { allowNull: false, type: Sequelize.STRING(255) },
      password: { allowNull: false, type: Sequelize.STRING(255) },
      image: { allowNull: true, type: Sequelize.STRING(255) },
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE `users` ADD COLUMN `active_email` VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN `status` = 1 THEN `email` ELSE NULL END) STORED',
    );
    await queryInterface.addIndex('users', ['active_email'], {
      unique: true,
      name: 'users_active_email_unique',
    });
    await queryInterface.createTable('user_tokens', {
      ...base,
      user_id: reference('users'),
      token: { allowNull: true, type: Sequelize.STRING(512), unique: true },
      refresh_token_hash: { allowNull: true, type: Sequelize.STRING(64), unique: true },
      expires_at: { allowNull: true, type: Sequelize.DATE },
      refresh_expires_at: { allowNull: true, type: Sequelize.DATE },
      otp: { allowNull: true, type: Sequelize.STRING(10) },
      otp_reference: { allowNull: true, type: Sequelize.STRING(512) },
      reset_token: { allowNull: true, type: Sequelize.STRING(512) },
    });
    await queryInterface.createTable('activity_logs', {
      ...base,
      module: { allowNull: false, type: Sequelize.STRING(100) },
      module_id: { allowNull: true, type: Sequelize.BIGINT.UNSIGNED },
      action: { allowNull: false, type: Sequelize.STRING(40) },
      field: { allowNull: true, type: Sequelize.STRING(100) },
      old_value: { allowNull: true, type: Sequelize.JSON },
      new_value: { allowNull: true, type: Sequelize.JSON },
      description: { allowNull: false, type: Sequelize.STRING(500) },
      meta: { allowNull: true, type: Sequelize.JSON },
      created_by_name: { allowNull: true, type: Sequelize.STRING(255) },
    });
    await queryInterface.createTable('app_settings', {
      ...base,
      key: { allowNull: false, type: Sequelize.STRING(100), unique: true },
      value: { allowNull: true, type: Sequelize.TEXT },
      description: { allowNull: true, type: Sequelize.STRING(255) },
    });
    await queryInterface.createTable('departments', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(255), unique: true },
      description: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.createTable('designations', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(255), unique: true },
      description: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.createTable('locations', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(255), unique: true },
      address: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.createTable('vendors', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(255) },
      contact_name: { allowNull: true, type: Sequelize.STRING(255) },
      email: { allowNull: true, type: Sequelize.STRING(255) },
      phone: { allowNull: true, type: Sequelize.STRING(50) },
      address: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.createTable('asset_categories', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(255), unique: true },
      description: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.createTable('employees', {
      ...base,
      user_id: { ...reference('users', true), unique: true },
      employee_code: { allowNull: false, type: Sequelize.STRING(100), unique: true },
      first_name: { allowNull: false, type: Sequelize.STRING(255) },
      last_name: { allowNull: false, type: Sequelize.STRING(255) },
      email: { allowNull: false, type: Sequelize.STRING(255) },
      phone: { allowNull: true, type: Sequelize.STRING(50) },
      department_id: reference('departments', true),
      designation_id: reference('designations', true),
      manager_id: reference('employees', true),
      location_id: reference('locations', true),
      join_date: { allowNull: true, type: Sequelize.DATEONLY },
      last_working_date: { allowNull: true, type: Sequelize.DATEONLY },
      employment_status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      profile_image: { allowNull: true, type: Sequelize.STRING(255) },
    });
    await queryInterface.addIndex('activity_logs', ['module', 'module_id']);
    await queryInterface.addIndex('employees', ['email']);
  },

  async down(queryInterface) {
    for (const table of [
      'employees',
      'asset_categories',
      'vendors',
      'locations',
      'designations',
      'departments',
      'app_settings',
      'activity_logs',
      'user_tokens',
      'users',
      'permissions',
      'modules',
      'roles',
    ]) {
      await queryInterface.dropTable(table);
    }
  },
};
