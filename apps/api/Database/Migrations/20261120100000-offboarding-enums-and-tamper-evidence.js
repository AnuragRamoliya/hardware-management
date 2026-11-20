'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add verification columns to offboarding_cases
    await queryInterface.addColumn('offboarding_cases', 'verification_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('offboarding_cases', 'verification_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addIndex('offboarding_cases', ['verification_code'], {
      name: 'idx_offboarding_cases_verification_code',
    });

    // 2. Add priority column to offboarding_tasks
    await queryInterface.addColumn('offboarding_tasks', 'priority', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'standard',
    });

    // 3. Drop open_case_guard before altering case_status column
    try {
      await queryInterface.removeIndex('offboarding_cases', 'uq_offboarding_cases_open_guard');
    } catch {
      // index may differ
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE `offboarding_cases` DROP COLUMN `open_case_guard`',
    );

    // 4. Alter case_status in offboarding_cases from TINYINT to VARCHAR(30)
    // First alter column to varchar
    await queryInterface.changeColumn('offboarding_cases', 'case_status', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'open',
    });

    // Convert existing numeric codes to string enums
    await queryInterface.sequelize.query(`
      UPDATE \`offboarding_cases\`
      SET \`case_status\` = CASE \`case_status\`
        WHEN '1' THEN 'open'
        WHEN '2' THEN 'in_progress'
        WHEN '3' THEN 'pending_clearance'
        WHEN '4' THEN 'completed'
        WHEN '5' THEN 'cancelled'
        ELSE 'open'
      END
    `);

    // Recreate open_case_guard with string statuses
    await queryInterface.sequelize.query(`
      ALTER TABLE \`offboarding_cases\`
      ADD COLUMN \`open_case_guard\` BIGINT UNSIGNED
      GENERATED ALWAYS AS (CASE WHEN \`case_status\` IN ('open', 'in_progress', 'pending_clearance') AND \`status\` = 1 THEN \`employee_id\` ELSE NULL END) PERSISTENT
    `);

    await queryInterface.addIndex('offboarding_cases', ['open_case_guard'], {
      unique: true,
      name: 'uq_offboarding_cases_open_guard',
    });

    // 5. Alter task_type in offboarding_tasks from TINYINT to VARCHAR(30)
    await queryInterface.changeColumn('offboarding_tasks', 'task_type', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'checklist',
    });

    await queryInterface.sequelize.query(`
      UPDATE \`offboarding_tasks\`
      SET \`task_type\` = CASE \`task_type\`
        WHEN '1' THEN 'asset'
        WHEN '2' THEN 'software'
        WHEN '3' THEN 'credential'
        WHEN '4' THEN 'request'
        WHEN '5' THEN 'checklist'
        ELSE 'checklist'
      END
    `);

    // 6. Alter task_status in offboarding_tasks from TINYINT to VARCHAR(30)
    await queryInterface.changeColumn('offboarding_tasks', 'task_status', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'pending',
    });

    await queryInterface.sequelize.query(`
      UPDATE \`offboarding_tasks\`
      SET \`task_status\` = CASE \`task_status\`
        WHEN '1' THEN 'pending'
        WHEN '2' THEN 'in_progress'
        WHEN '3' THEN 'completed'
        WHEN '4' THEN 'waived'
        WHEN '5' THEN 'exception'
        WHEN '6' THEN 'cancelled'
        ELSE 'pending'
      END
    `);
  },

  async down(queryInterface, Sequelize) {
    // 1. Revert task_status in offboarding_tasks
    await queryInterface.sequelize.query(`
      UPDATE \`offboarding_tasks\`
      SET \`task_status\` = CASE \`task_status\`
        WHEN 'pending' THEN '1'
        WHEN 'in_progress' THEN '2'
        WHEN 'completed' THEN '3'
        WHEN 'waived' THEN '4'
        WHEN 'exception' THEN '5'
        WHEN 'cancelled' THEN '6'
        ELSE '1'
      END
    `);
    await queryInterface.changeColumn('offboarding_tasks', 'task_status', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });

    // 2. Revert task_type in offboarding_tasks
    await queryInterface.sequelize.query(`
      UPDATE \`offboarding_tasks\`
      SET \`task_type\` = CASE \`task_type\`
        WHEN 'asset' THEN '1'
        WHEN 'software' THEN '2'
        WHEN 'credential' THEN '3'
        WHEN 'request' THEN '4'
        WHEN 'checklist' THEN '5'
        ELSE '5'
      END
    `);
    await queryInterface.changeColumn('offboarding_tasks', 'task_type', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 5,
    });

    // 3. Drop priority column
    await queryInterface.removeColumn('offboarding_tasks', 'priority');

    // 4. Drop open_case_guard before reverting case_status
    try {
      await queryInterface.removeIndex('offboarding_cases', 'uq_offboarding_cases_open_guard');
    } catch {
      // ignore
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE `offboarding_cases` DROP COLUMN `open_case_guard`',
    );

    // 5. Revert case_status in offboarding_cases
    await queryInterface.sequelize.query(`
      UPDATE \`offboarding_cases\`
      SET \`case_status\` = CASE \`case_status\`
        WHEN 'open' THEN '1'
        WHEN 'in_progress' THEN '2'
        WHEN 'pending_clearance' THEN '3'
        WHEN 'completed' THEN '4'
        WHEN 'cancelled' THEN '5'
        ELSE '1'
      END
    `);
    await queryInterface.changeColumn('offboarding_cases', 'case_status', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });

    // Recreate open_case_guard with numeric statuses
    await queryInterface.sequelize.query(`
      ALTER TABLE \`offboarding_cases\`
      ADD COLUMN \`open_case_guard\` BIGINT UNSIGNED
      GENERATED ALWAYS AS (CASE WHEN \`case_status\` IN (1, 2, 3) AND \`status\` = 1 THEN \`employee_id\` ELSE NULL END) PERSISTENT
    `);
    await queryInterface.addIndex('offboarding_cases', ['open_case_guard'], {
      unique: true,
      name: 'uq_offboarding_cases_open_guard',
    });

    // 6. Remove verification columns
    try {
      await queryInterface.removeIndex(
        'offboarding_cases',
        'idx_offboarding_cases_verification_code',
      );
    } catch {
      // ignore
    }
    await queryInterface.removeColumn('offboarding_cases', 'verification_hash');
    await queryInterface.removeColumn('offboarding_cases', 'verification_code');
  },
};
