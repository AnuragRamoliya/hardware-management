'use strict';

const baseColumns = (Sequelize) => ({
  id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT.UNSIGNED },
  status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
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

    // 1. Alter permissions table: add approve_access and reveal_access
    await queryInterface.addColumn('permissions', 'approve_access', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('permissions', 'reveal_access', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    // 2. Alter users table: add lockout, failed count, consent
    await queryInterface.addColumn('users', 'failed_login_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('users', 'locked_until', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'consent_accepted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'consent_version', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    // 3. Alter user_tokens table: session tracking and revocation
    await queryInterface.addColumn('user_tokens', 'is_revoked', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('user_tokens', 'device_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('user_tokens', 'ip_address', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('user_tokens', 'user_agent', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('user_tokens', 'last_active_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 4. Alter activity_logs table: hash chain
    await queryInterface.addColumn('activity_logs', 'prev_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('activity_logs', 'hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    // 5. Create credential_types table
    await queryInterface.createTable('credential_types', {
      ...base,
      name: { allowNull: false, unique: true, type: Sequelize.STRING(100) },
      category: { allowNull: false, type: Sequelize.STRING(50) },
      icon: { allowNull: true, type: Sequelize.STRING(100) },
      expiry_days: { allowNull: true, type: Sequelize.INTEGER },
      min_length: { allowNull: false, defaultValue: 12, type: Sequelize.INTEGER },
      require_complexity: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      requires_approval: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      allow_employee_submit: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      notes: { allowNull: true, type: Sequelize.TEXT },
    });

    // 6. Create credentials table
    await queryInterface.createTable('credentials', {
      ...base,
      employee_id: { ...ref('employees', false) },
      credential_type_id: { ...ref('credential_types', false) },
      software_id: ref('software', true),
      asset_id: ref('assets', true),
      label: { allowNull: false, type: Sequelize.STRING(255) },
      username: { allowNull: false, type: Sequelize.STRING(255) },
      url: { allowNull: true, type: Sequelize.STRING(500) },
      password_enc: { allowNull: false, type: Sequelize.TEXT },
      iv: { allowNull: false, type: Sequelize.STRING(64) },
      auth_tag: { allowNull: false, type: Sequelize.STRING(64) },
      key_version: { allowNull: false, defaultValue: '1', type: Sequelize.STRING(20) },
      notes: { allowNull: true, type: Sequelize.TEXT },
      provided_by: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      approval_status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      submitted_at: { allowNull: true, type: Sequelize.DATE },
      reviewed_by: ref('users', true),
      reviewed_at: { allowNull: true, type: Sequelize.DATE },
      review_feedback: { allowNull: true, type: Sequelize.TEXT },
      must_change_on_first_use: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      expires_at: { allowNull: true, type: Sequelize.DATE },
      last_changed_at: { allowNull: true, type: Sequelize.DATE },
      last_revealed_at: { allowNull: true, type: Sequelize.DATE },
    });

    // 7. Create credential_history table
    await queryInterface.createTable('credential_history', {
      ...base,
      credential_id: { ...ref('credentials', false) },
      changed_by: { ...ref('users', false) },
      change_type: { allowNull: false, type: Sequelize.STRING(50) },
      meta: { allowNull: true, type: Sequelize.JSON },
    });

    // 8. Create credential_collection_requests table
    await queryInterface.createTable('credential_collection_requests', {
      ...base,
      employee_id: { ...ref('employees', false) },
      credential_type_id: { ...ref('credential_types', false) },
      requested_by: { ...ref('users', false) },
      message: { allowNull: true, type: Sequelize.TEXT },
      due_date: { allowNull: false, type: Sequelize.DATEONLY },
      request_status: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      credential_id: ref('credentials', true),
      fulfilled_at: { allowNull: true, type: Sequelize.DATE },
    });

    // 9. Create credential_access_logs table
    await queryInterface.createTable('credential_access_logs', {
      ...base,
      credential_id: { ...ref('credentials', false) },
      employee_id: { ...ref('employees', false) },
      accessed_by: { ...ref('users', false) },
      action: { allowNull: false, type: Sequelize.STRING(50) },
      reason: { allowNull: true, type: Sequelize.TEXT },
      ip_address: { allowNull: true, type: Sequelize.STRING(100) },
      user_agent: { allowNull: true, type: Sequelize.STRING(500) },
      success: { allowNull: false, defaultValue: 1, type: Sequelize.TINYINT.UNSIGNED },
      failure_reason: { allowNull: true, type: Sequelize.STRING(255) },
      accessed_at: { allowNull: false, type: Sequelize.DATE },
      prev_hash: { allowNull: false, type: Sequelize.STRING(64) },
      hash: { allowNull: false, type: Sequelize.STRING(64) },
    });

    // 10. Create login_history table
    await queryInterface.createTable('login_history', {
      ...base,
      user_id: ref('users', true),
      email_attempted: { allowNull: false, type: Sequelize.STRING(255) },
      success: { allowNull: false, type: Sequelize.TINYINT.UNSIGNED },
      ip_address: { allowNull: true, type: Sequelize.STRING(100) },
      user_agent: { allowNull: true, type: Sequelize.STRING(500) },
      device_name: { allowNull: true, type: Sequelize.STRING(255) },
      failure_reason: { allowNull: true, type: Sequelize.STRING(255) },
    });

    // Indexes
    await queryInterface.addIndex('credentials', ['employee_id', 'credential_type_id', 'label'], {
      name: 'idx_credentials_employee_type_label',
    });
    await queryInterface.addIndex('credentials', ['approval_status']);
    await queryInterface.addIndex('credentials', ['provided_by']);
    await queryInterface.addIndex('credentials', ['expires_at']);
    await queryInterface.addIndex('credential_collection_requests', [
      'employee_id',
      'request_status',
    ]);
    await queryInterface.addIndex('credential_access_logs', ['credential_id', 'accessed_at']);
    await queryInterface.addIndex('login_history', ['user_id', 'email_attempted', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('login_history');
    await queryInterface.dropTable('credential_access_logs');
    await queryInterface.dropTable('credential_collection_requests');
    await queryInterface.dropTable('credential_history');
    await queryInterface.dropTable('credentials');
    await queryInterface.dropTable('credential_types');
    await queryInterface.removeColumn('activity_logs', 'hash');
    await queryInterface.removeColumn('activity_logs', 'prev_hash');
    await queryInterface.removeColumn('user_tokens', 'last_active_at');
    await queryInterface.removeColumn('user_tokens', 'user_agent');
    await queryInterface.removeColumn('user_tokens', 'ip_address');
    await queryInterface.removeColumn('user_tokens', 'device_name');
    await queryInterface.removeColumn('user_tokens', 'is_revoked');
    await queryInterface.removeColumn('users', 'consent_version');
    await queryInterface.removeColumn('users', 'consent_accepted_at');
    await queryInterface.removeColumn('users', 'locked_until');
    await queryInterface.removeColumn('users', 'failed_login_count');
    await queryInterface.removeColumn('permissions', 'reveal_access');
    await queryInterface.removeColumn('permissions', 'approve_access');
  },
};
