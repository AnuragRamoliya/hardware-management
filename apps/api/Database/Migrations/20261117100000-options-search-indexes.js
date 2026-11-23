'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('permissions', 'options_access', {
      allowNull: false,
      defaultValue: 0,
      type: Sequelize.TINYINT.UNSIGNED,
      comment: 'Allows loading select options without full read access',
    });

    await queryInterface.sequelize.query(
      "ALTER TABLE `employees` ADD COLUMN `search_text` VARCHAR(610) GENERATED ALWAYS AS (CONCAT_WS(' ', `first_name`, `last_name`, `employee_code`)) STORED",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `employees` ADD COLUMN `label_sort` VARCHAR(510) GENERATED ALWAYS AS (TRIM(CONCAT_WS(' ', `first_name`, `last_name`))) STORED",
    );

    const indexes = [
      ['users', ['status', 'first_name'], 'users_status_first_name_options_idx'],
      ['users', ['status', 'last_name'], 'users_status_last_name_options_idx'],
      ['users', ['status', 'email'], 'users_status_email_options_idx'],
      ['users', ['email'], 'users_email_options_idx'],
      ['roles', ['status', 'name'], 'roles_status_name_options_idx'],
      ['roles', ['status', 'type'], 'roles_status_type_options_idx'],
      ['modules', ['status', 'name'], 'modules_status_name_options_idx'],
      ['departments', ['status', 'name'], 'departments_status_name_options_idx'],
      ['designations', ['status', 'name'], 'designations_status_name_options_idx'],
      ['locations', ['status', 'name'], 'locations_status_name_options_idx'],
      ['vendors', ['status', 'name'], 'vendors_status_name_options_idx'],
      ['vendors', ['status', 'contact_name'], 'vendors_status_contact_name_options_idx'],
      ['vendors', ['status', 'email'], 'vendors_status_email_options_idx'],
      ['asset_categories', ['status', 'name'], 'asset_categories_status_name_options_idx'],
      ['employees', ['status', 'search_text'], 'employees_status_search_text_options_idx'],
      ['employees', ['status', 'label_sort'], 'employees_status_label_sort_options_idx'],
      ['employees', ['status', 'employee_code'], 'employees_status_code_options_idx'],
      ['employees', ['status', 'email'], 'employees_status_email_options_idx'],
    ];

    for (const [table, fields, name] of indexes) {
      await queryInterface.addIndex(table, fields, { name, using: 'BTREE' });
    }
  },

  async down(queryInterface) {
    const indexes = [
      ['users', 'users_status_first_name_options_idx'],
      ['users', 'users_status_last_name_options_idx'],
      ['users', 'users_status_email_options_idx'],
      ['users', 'users_email_options_idx'],
      ['roles', 'roles_status_name_options_idx'],
      ['roles', 'roles_status_type_options_idx'],
      ['modules', 'modules_status_name_options_idx'],
      ['departments', 'departments_status_name_options_idx'],
      ['designations', 'designations_status_name_options_idx'],
      ['locations', 'locations_status_name_options_idx'],
      ['vendors', 'vendors_status_name_options_idx'],
      ['vendors', 'vendors_status_contact_name_options_idx'],
      ['vendors', 'vendors_status_email_options_idx'],
      ['asset_categories', 'asset_categories_status_name_options_idx'],
      ['employees', 'employees_status_search_text_options_idx'],
      ['employees', 'employees_status_label_sort_options_idx'],
      ['employees', 'employees_status_code_options_idx'],
      ['employees', 'employees_status_email_options_idx'],
    ];
    for (const [table, name] of indexes) {
      await queryInterface.removeIndex(table, name);
    }
    await queryInterface.removeColumn('employees', 'search_text');
    await queryInterface.removeColumn('employees', 'label_sort');
    await queryInterface.removeColumn('permissions', 'options_access');
  },
};
