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

module.exports = {
  async up(queryInterface, Sequelize) {
    const base = baseColumns(Sequelize);

    // 1. Create export_jobs table
    await queryInterface.createTable('export_jobs', {
      ...base,
      report_key: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      format: {
        allowNull: false,
        type: Sequelize.STRING(20),
      },
      filters: {
        allowNull: true,
        type: Sequelize.JSON,
      },
      job_status: {
        allowNull: false,
        defaultValue: 'queued',
        type: Sequelize.STRING(30),
      },
      progress: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      row_count: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      file_path: {
        allowNull: true,
        type: Sequelize.STRING(500),
      },
      file_sha256: {
        allowNull: true,
        type: Sequelize.STRING(64),
      },
      error: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      requested_by: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      expires_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // 2. Indexes for performance
    await queryInterface.addIndex('export_jobs', ['report_key'], {
      name: 'idx_export_jobs_report_key',
    });
    await queryInterface.addIndex('export_jobs', ['requested_by', 'job_status'], {
      name: 'idx_export_jobs_user_status',
    });
    await queryInterface.addIndex('export_jobs', ['job_status', 'expires_at'], {
      name: 'idx_export_jobs_status_expires',
    });

    // 3. Ensure 'reports' module row exists in modules table
    const [existingModules] = await queryInterface.sequelize.query(
      "SELECT id FROM `modules` WHERE `name` IN ('reports', 'report') LIMIT 1",
    );
    let moduleId;
    if (existingModules.length > 0) {
      moduleId = existingModules[0].id;
    } else {
      const [insertRes] = await queryInterface.sequelize.query(
        "INSERT INTO `modules` (`name`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES ('reports', 26, 1, NOW(), NOW())",
      );
      moduleId = insertRes;
    }

    // 4. Role permissions for reports: super_admin, hardware_manager, hr
    const [roles] = await queryInterface.sequelize.query('SELECT `id`, `type` FROM `roles`');
    for (const r of roles) {
      let read = 0;
      let write = 0;
      let del = 0;
      if (r.type === 'super_admin') {
        read = 1;
        write = 1;
        del = 1;
      } else if (r.type === 'hardware_manager') {
        read = 1;
        write = 1;
        del = 0;
      } else if (r.type === 'hr') {
        read = 1;
        write = 0;
        del = 0;
      } else {
        // employee: 0, 0, 0
        read = 0;
        write = 0;
        del = 0;
      }

      await queryInterface.sequelize.query(
        'INSERT INTO `permissions` (`role_id`, `module_id`, `read_access`, `write_access`, `delete_access`, `status`, `createdAt`, `updatedAt`) ' +
          'VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW()) ' +
          'ON DUPLICATE KEY UPDATE `read_access` = VALUES(`read_access`), `write_access` = VALUES(`write_access`), `delete_access` = VALUES(`delete_access`), `status` = 1',
        { replacements: [r.id, moduleId, read, write, del] },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('export_jobs');
    const [existingModules] = await queryInterface.sequelize.query(
      "SELECT id FROM `modules` WHERE `name` = 'reports'",
    );
    if (existingModules.length > 0) {
      const moduleId = existingModules[0].id;
      await queryInterface.sequelize.query('DELETE FROM `permissions` WHERE `module_id` = ?', {
        replacements: [moduleId],
      });
      await queryInterface.sequelize.query('DELETE FROM `modules` WHERE `id` = ?', {
        replacements: [moduleId],
      });
    }
  },
};
