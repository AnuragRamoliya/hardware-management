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

const ref = (table, nullable = true, onDelete = 'RESTRICT') => ({
  allowNull: nullable,
  type: require('sequelize').BIGINT.UNSIGNED,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const base = baseColumns(Sequelize);

    // 1. Create requests table
    await queryInterface.createTable('requests', {
      ...base,
      request_no: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(50),
      },
      employee_id: { ...ref('employees', false) },
      request_type: {
        allowNull: false,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      category_id: ref('asset_categories', true),
      current_asset_id: ref('assets', true),
      software_id: ref('software', true),
      title: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      reason: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      priority: {
        allowNull: false,
        defaultValue: 2,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      needed_by_date: {
        allowNull: true,
        type: Sequelize.DATEONLY,
      },
      request_status: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      assigned_to: ref('users', true),
      reviewed_by: ref('users', true),
      reviewed_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      decision_feedback: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      awaiting_stock: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      assigned_asset_id: ref('assets', true),
      assigned_license_id: ref('software_licenses', true),
      fulfilled_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      fulfilled_by: ref('users', true),
      closed_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      sla_due_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      sla_breached: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      cancelled_reason: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
    });

    await queryInterface.addIndex('requests', ['employee_id'], {
      name: 'idx_requests_employee_id',
    });
    await queryInterface.addIndex('requests', ['request_type'], {
      name: 'idx_requests_request_type',
    });
    await queryInterface.addIndex('requests', ['request_status'], {
      name: 'idx_requests_request_status',
    });
    await queryInterface.addIndex('requests', ['priority'], {
      name: 'idx_requests_priority',
    });
    await queryInterface.addIndex('requests', ['assigned_to'], {
      name: 'idx_requests_assigned_to',
    });
    await queryInterface.addIndex('requests', ['category_id'], {
      name: 'idx_requests_category_id',
    });
    await queryInterface.addIndex('requests', ['current_asset_id'], {
      name: 'idx_requests_current_asset_id',
    });
    await queryInterface.addIndex('requests', ['software_id'], {
      name: 'idx_requests_software_id',
    });
    await queryInterface.addIndex('requests', ['awaiting_stock'], {
      name: 'idx_requests_awaiting_stock',
    });
    await queryInterface.addIndex('requests', ['sla_breached'], {
      name: 'idx_requests_sla_breached',
    });
    await queryInterface.addIndex('requests', ['sla_due_at'], {
      name: 'idx_requests_sla_due_at',
    });
    await queryInterface.addIndex('requests', ['needed_by_date'], {
      name: 'idx_requests_needed_by_date',
    });
    await queryInterface.addIndex('requests', ['createdAt'], {
      name: 'idx_requests_created_at',
    });

    // 2. Create request_comments table
    await queryInterface.createTable('request_comments', {
      ...base,
      request_id: { ...ref('requests', false, 'CASCADE') },
      user_id: { ...ref('users', false) },
      comment: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      is_internal: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.TINYINT.UNSIGNED,
      },
    });

    await queryInterface.addIndex('request_comments', ['request_id'], {
      name: 'idx_request_comments_request_id',
    });
    await queryInterface.addIndex('request_comments', ['user_id'], {
      name: 'idx_request_comments_user_id',
    });
    await queryInterface.addIndex('request_comments', ['is_internal'], {
      name: 'idx_request_comments_is_internal',
    });

    // 3. Create request_status_history table
    await queryInterface.createTable('request_status_history', {
      ...base,
      request_id: { ...ref('requests', false, 'CASCADE') },
      from_status: {
        allowNull: false,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      to_status: {
        allowNull: false,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      changed_by: { ...ref('users', false) },
      note: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
    });

    await queryInterface.addIndex('request_status_history', ['request_id'], {
      name: 'idx_request_history_request_id',
    });
    await queryInterface.addIndex('request_status_history', ['createdAt'], {
      name: 'idx_request_history_created_at',
    });

    // 4. Create request_attachments table
    await queryInterface.createTable('request_attachments', {
      ...base,
      request_id: { ...ref('requests', false, 'CASCADE') },
      file_name: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      file_path: {
        allowNull: false,
        type: Sequelize.STRING(500),
      },
      mime_type: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      size: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      uploaded_by: { ...ref('users', false) },
    });

    await queryInterface.addIndex('request_attachments', ['request_id'], {
      name: 'idx_request_attachments_request_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('request_attachments');
    await queryInterface.dropTable('request_status_history');
    await queryInterface.dropTable('request_comments');
    await queryInterface.dropTable('requests');
  },
};
