'use strict';

const modules = [
  'user',
  'role',
  'employee',
  'department',
  'designation',
  'location',
  'vendor',
  'asset_category',
  'asset',
  'asset_assignment',
  'asset_maintenance',
  'software',
  'software_license',
  'credential',
  'request',
  'offboarding',
  'report',
  'audit_log',
  'setting',
  'module',
  'permission',
];

const roleDefinitions = [
  { name: 'Super Admin', type: 'super_admin' },
  { name: 'Hardware Manager', type: 'hardware_manager' },
  { name: 'HR', type: 'hr' },
  { name: 'Employee', type: 'employee' },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [index, name] of modules.entries()) {
      await queryInterface.sequelize.query(
        'INSERT INTO `modules` (`name`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `sortOrder` = VALUES(`sortOrder`), `status` = 1',
        { replacements: [name, index + 1] },
      );
    }
    for (const [index, role] of roleDefinitions.entries()) {
      await queryInterface.sequelize.query(
        'INSERT INTO `roles` (`name`, `type`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = 1',
        { replacements: [role.name, role.type] },
      );
    }

    const [roleRows] = await queryInterface.sequelize.query('SELECT `id`, `type` FROM `roles`');
    const [moduleRows] = await queryInterface.sequelize.query('SELECT `id`, `name` FROM `modules`');
    const moduleIds = new Map(moduleRows.map((module) => [module.name, module.id]));
    const permissions = [];
    for (const role of roleRows) {
      for (const moduleName of modules) {
        let flags = [0, 0, 0];
        if (role.type === 'super_admin') flags = [1, 1, 1];
        if (
          role.type === 'hardware_manager' &&
          [
            'asset',
            'asset_assignment',
            'asset_maintenance',
            'software',
            'software_license',
          ].includes(moduleName)
        )
          flags = [1, 1, 1];
        if (
          role.type === 'hr' &&
          [
            'asset',
            'asset_assignment',
            'asset_maintenance',
            'software',
            'software_license',
          ].includes(moduleName)
        )
          flags = [1, 0, 0];
        if (
          role.type === 'hardware_manager' &&
          !['role', 'permission', 'user'].includes(moduleName)
        ) {
          flags = [1, 1, 1];
        }
        if (['hardware_manager', 'hr', 'employee'].includes(role.type) && moduleName === 'user') {
          flags = [1, 1, 0];
        }
        if (
          role.type === 'hr' &&
          ['employee', 'department', 'designation', 'location', 'audit_log'].includes(moduleName)
        ) {
          flags = moduleName === 'audit_log' ? [1, 0, 0] : [1, 1, 0];
        }
        if (role.type === 'employee' && moduleName === 'employee') flags = [1, 0, 0];
        if (flags.some(Boolean)) {
          permissions.push([role.id, moduleIds.get(moduleName), ...flags]);
        }
      }
    }
    for (const permission of permissions) {
      await queryInterface.sequelize.query(
        'INSERT INTO `permissions` (`role_id`, `module_id`, `read_access`, `write_access`, `delete_access`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `read_access` = VALUES(`read_access`), `write_access` = VALUES(`write_access`), `delete_access` = VALUES(`delete_access`), `status` = 1',
        { replacements: permission },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('modules', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
