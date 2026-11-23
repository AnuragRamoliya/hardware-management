'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('employees');
    if (!tableInfo.vault_consent_accepted_at) {
      await queryInterface.addColumn('employees', 'vault_consent_accepted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('employees');
    if (tableInfo.vault_consent_accepted_at) {
      await queryInterface.removeColumn('employees', 'vault_consent_accepted_at');
    }
  },
};
