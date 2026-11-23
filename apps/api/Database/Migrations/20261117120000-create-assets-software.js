'use strict';

const baseColumns = (Sequelize) => ({
  id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT.UNSIGNED },
  status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
  created_by: { allowNull: true, type: Sequelize.BIGINT.UNSIGNED },
  updated_by: { allowNull: true, type: Sequelize.BIGINT.UNSIGNED },
  createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
});
const ref = (table, nullable = true) => ({
  allowNull: nullable,
  type: require('sequelize').BIGINT.UNSIGNED,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const base = baseColumns(Sequelize);
    await queryInterface.createTable('assets', {
      ...base,
      asset_tag: { allowNull: false, unique: true, type: Sequelize.STRING(32) },
      serial_no: { allowNull: true, unique: true, type: Sequelize.STRING(150) },
      category_id: ref('asset_categories'),
      brand: { allowNull: true, type: Sequelize.STRING(120) },
      model: { allowNull: true, type: Sequelize.STRING(150) },
      vendor_id: ref('vendors'),
      purchase_date: { allowNull: true, type: Sequelize.DATEONLY },
      purchase_cost: { allowNull: true, type: Sequelize.DECIMAL(13, 2) },
      warranty_start: { allowNull: true, type: Sequelize.DATEONLY },
      warranty_end: { allowNull: true, type: Sequelize.DATEONLY },
      condition: { allowNull: false, defaultValue: 'good', type: Sequelize.ENUM('new', 'good', 'fair', 'poor') },
      asset_status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      location_id: ref('locations'),
      parent_asset_id: ref('assets'),
      specs: { allowNull: true, type: Sequelize.JSON },
      notes: { allowNull: true, type: Sequelize.TEXT },
      photo_url: { allowNull: true, type: Sequelize.STRING(500) },
    });
    await queryInterface.createTable('asset_assignments', {
      ...base,
      asset_id: { ...ref('assets', false) },
      employee_id: { ...ref('employees', false) },
      assigned_at: { allowNull: false, type: Sequelize.DATE },
      assigned_by: ref('users', false),
      request_id: { allowNull: true, type: Sequelize.BIGINT.UNSIGNED },
      due_return_date: { allowNull: true, type: Sequelize.DATEONLY },
      returned_at: { allowNull: true, type: Sequelize.DATE },
      received_by: ref('users'),
      return_condition: { allowNull: true, type: Sequelize.ENUM('new', 'good', 'fair', 'poor') },
      return_notes: { allowNull: true, type: Sequelize.TEXT },
      note: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE `asset_assignments` ADD COLUMN `open_asset_id` BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN `returned_at` IS NULL THEN `asset_id` ELSE NULL END) PERSISTENT',
    );
    await queryInterface.addIndex('asset_assignments', ['open_asset_id'], { unique: true, name: 'asset_assignments_open_asset_unique' });
    await queryInterface.createTable('asset_maintenance', {
      ...base,
      asset_id: { ...ref('assets', false) },
      issue: { allowNull: false, type: Sequelize.TEXT },
      vendor_id: ref('vendors'),
      cost: { allowNull: true, type: Sequelize.DECIMAL(13, 2) },
      sent_at: { allowNull: false, type: Sequelize.DATE },
      returned_at: { allowNull: true, type: Sequelize.DATE },
      resolution: { allowNull: true, type: Sequelize.TEXT },
      maintenance_status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
    });
    await queryInterface.createTable('software', {
      ...base,
      name: { allowNull: false, type: Sequelize.STRING(255) },
      vendor_id: ref('vendors'),
      category: { allowNull: false, type: Sequelize.STRING(60) },
      license_type: { allowNull: false, type: Sequelize.ENUM('per_user', 'per_seat', 'subscription', 'perpetual', 'free') },
      cost: { allowNull: true, type: Sequelize.DECIMAL(13, 2) },
      billing_cycle: { allowNull: true, type: Sequelize.STRING(40) },
      renewal_date: { allowNull: true, type: Sequelize.DATEONLY },
      notes: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.createTable('software_licenses', {
      ...base,
      software_id: { ...ref('software', false) },
      license_key: { allowNull: true, type: Sequelize.TEXT },
      seats_total: { allowNull: false, defaultValue: 1, type: Sequelize.INTEGER.UNSIGNED },
      purchase_date: { allowNull: true, type: Sequelize.DATEONLY },
      expiry_date: { allowNull: true, type: Sequelize.DATEONLY },
    });
    await queryInterface.createTable('software_assignments', {
      ...base,
      software_id: { ...ref('software', false) },
      license_id: ref('software_licenses'),
      employee_id: { ...ref('employees', false) },
      assigned_at: { allowNull: false, type: Sequelize.DATE },
      assigned_by: ref('users', false),
      revoked_at: { allowNull: true, type: Sequelize.DATE },
      revoked_by: ref('users'),
      note: { allowNull: true, type: Sequelize.TEXT },
    });
    await queryInterface.sequelize.query(
      "ALTER TABLE software_assignments ADD COLUMN open_employee_software VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN revoked_at IS NULL THEN CONCAT(software_id, '-', employee_id) ELSE NULL END) PERSISTENT",
    );
    await queryInterface.addIndex('software_assignments', ['open_employee_software'], { unique: true, name: 'software_assignments_open_employee_unique' });
    await queryInterface.createTable('notifications', {
      ...base,
      recipient_user_id: { ...ref('users') },
      kind: { allowNull: false, type: Sequelize.STRING(40) },
      record_type: { allowNull: false, type: Sequelize.STRING(40) },
      record_id: { allowNull: false, type: Sequelize.BIGINT.UNSIGNED },
      threshold_days: { allowNull: true, type: Sequelize.TINYINT.UNSIGNED },
      title: { allowNull: false, type: Sequelize.STRING(255) },
      message: { allowNull: false, type: Sequelize.STRING(500) },
      read_at: { allowNull: true, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint('notifications', { fields: ['record_type', 'record_id', 'threshold_days', 'kind'], type: 'unique', name: 'notifications_alert_dedupe_unique' });
    const indexes = [
      ['assets', ['asset_status', 'status', 'id'], 'assets_status_list_idx'],
      ['assets', ['category_id', 'asset_status'], 'assets_category_status_idx'],
      ['assets', ['vendor_id', 'location_id'], 'assets_vendor_location_idx'],
      ['assets', ['warranty_end'], 'assets_warranty_end_idx'],
      ['assets', ['purchase_date'], 'assets_purchase_date_idx'],
      ['assets', ['parent_asset_id'], 'assets_parent_idx'],
      ['asset_assignments', ['employee_id', 'returned_at', 'assigned_at'], 'asset_assignments_employee_history_idx'],
      ['asset_assignments', ['due_return_date', 'returned_at'], 'asset_assignments_due_idx'],
      ['asset_maintenance', ['asset_id', 'maintenance_status', 'sent_at'], 'asset_maintenance_history_idx'],
      ['software', ['category', 'license_type', 'status'], 'software_category_type_idx'],
      ['software', ['renewal_date'], 'software_renewal_idx'],
      ['software_licenses', ['software_id', 'expiry_date'], 'software_licenses_expiry_idx'],
      ['software_assignments', ['employee_id', 'revoked_at'], 'software_assignments_employee_idx'],
      ['software_assignments', ['license_id', 'revoked_at'], 'software_assignments_seat_idx'],
    ];
    for (const [table, fields, name] of indexes) await queryInterface.addIndex(table, fields, { name });
  },
  async down(queryInterface) {
    for (const table of ['notifications', 'software_assignments', 'software_licenses', 'software', 'asset_maintenance', 'asset_assignments', 'assets']) {
      await queryInterface.dropTable(table);
    }
  },
};
