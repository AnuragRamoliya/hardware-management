'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Align default value to 'queued'
    await queryInterface.changeColumn('export_jobs', 'job_status', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'queued',
    });

    // 2. Migrate existing status values
    await queryInterface.sequelize.query(
      "UPDATE export_jobs SET job_status = 'queued' WHERE job_status = 'pending';",
    );
    await queryInterface.sequelize.query(
      "UPDATE export_jobs SET job_status = 'running' WHERE job_status = 'processing';",
    );
    await queryInterface.sequelize.query(
      "UPDATE export_jobs SET job_status = 'done' WHERE job_status = 'completed';",
    );
  },

  async down(queryInterface, Sequelize) {
    // Revert status values
    await queryInterface.sequelize.query(
      "UPDATE export_jobs SET job_status = 'pending' WHERE job_status = 'queued';",
    );
    await queryInterface.sequelize.query(
      "UPDATE export_jobs SET job_status = 'processing' WHERE job_status = 'running';",
    );
    await queryInterface.sequelize.query(
      "UPDATE export_jobs SET job_status = 'completed' WHERE job_status = 'done';",
    );

    await queryInterface.changeColumn('export_jobs', 'job_status', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'pending',
    });
  },
};
