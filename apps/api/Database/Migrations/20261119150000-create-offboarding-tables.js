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
  deletedAt: {
    allowNull: true,
    type: Sequelize.DATE,
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

    // 1. Create checklist templates table
    await queryInterface.createTable('offboarding_checklist_templates', {
      ...base,
      title: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      description: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      default_assignee_role: {
        allowNull: true,
        type: Sequelize.STRING(50),
      },
      is_mandatory: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      sort_order: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER,
      },
      is_active: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
    });

    await queryInterface.addIndex('offboarding_checklist_templates', ['status', 'is_active'], {
      name: 'idx_offboarding_templates_status_active',
    });

    // 2. Create offboarding cases table
    await queryInterface.createTable('offboarding_cases', {
      ...base,
      case_no: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(50),
      },
      employee_id: { ...ref('employees', false) },
      exit_type: {
        allowNull: false,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      resignation_date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      last_working_date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      reason: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      initiated_by: { ...ref('users', false) },
      handover_to: ref('users', true),
      manager_id: ref('employees', true),
      case_status: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      completed_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      clearance_number: {
        allowNull: true,
        type: Sequelize.STRING(100),
      },
      clearance_issued_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      clearance_file_path: {
        allowNull: true,
        type: Sequelize.STRING(255),
      },
      handover_receipt_file_path: {
        allowNull: true,
        type: Sequelize.STRING(255),
      },
      notes: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
    });

    // Add generated guard column for one active case per employee
    await queryInterface.sequelize.query(`
      ALTER TABLE \`offboarding_cases\`
      ADD COLUMN \`open_case_guard\` BIGINT UNSIGNED
      GENERATED ALWAYS AS (CASE WHEN \`case_status\` IN (1, 2, 3) AND \`status\` = 1 THEN \`employee_id\` ELSE NULL END) PERSISTENT
    `);

    await queryInterface.addIndex('offboarding_cases', ['open_case_guard'], {
      unique: true,
      name: 'uq_offboarding_cases_open_guard',
    });

    await queryInterface.addIndex('offboarding_cases', ['employee_id'], {
      name: 'idx_offboarding_cases_employee_id',
    });
    await queryInterface.addIndex('offboarding_cases', ['case_status'], {
      name: 'idx_offboarding_cases_case_status',
    });
    await queryInterface.addIndex('offboarding_cases', ['handover_to'], {
      name: 'idx_offboarding_cases_handover_to',
    });
    await queryInterface.addIndex('offboarding_cases', ['last_working_date'], {
      name: 'idx_offboarding_cases_lwd',
    });

    // 3. Create offboarding tasks table
    await queryInterface.createTable('offboarding_tasks', {
      ...base,
      case_id: { ...ref('offboarding_cases', false, 'CASCADE') },
      task_type: {
        allowNull: false,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      ref_id: {
        allowNull: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      ref_label: {
        allowNull: true,
        type: Sequelize.STRING(255),
      },
      title: {
        allowNull: false,
        type: Sequelize.STRING(255),
      },
      assigned_to: ref('users', true),
      task_status: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      is_mandatory: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      due_date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      completed_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      completed_by: ref('users', true),
      return_condition: {
        allowNull: true,
        type: Sequelize.STRING(50),
      },
      to_status: {
        allowNull: true,
        type: Sequelize.STRING(50),
      },
      outcome_notes: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      waived_by: ref('users', true),
      waive_reason: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
    });

    await queryInterface.addIndex('offboarding_tasks', ['case_id'], {
      name: 'idx_offboarding_tasks_case_id',
    });
    await queryInterface.addIndex('offboarding_tasks', ['task_type'], {
      name: 'idx_offboarding_tasks_task_type',
    });
    await queryInterface.addIndex('offboarding_tasks', ['task_status'], {
      name: 'idx_offboarding_tasks_task_status',
    });
    await queryInterface.addIndex('offboarding_tasks', ['assigned_to'], {
      name: 'idx_offboarding_tasks_assigned_to',
    });
    await queryInterface.addIndex('offboarding_tasks', ['due_date'], {
      name: 'idx_offboarding_tasks_due_date',
    });
    await queryInterface.addIndex('offboarding_tasks', ['task_type', 'ref_id'], {
      name: 'idx_offboarding_tasks_ref',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('offboarding_tasks');
    await queryInterface.dropTable('offboarding_cases');
    await queryInterface.dropTable('offboarding_checklist_templates');
  },
};
