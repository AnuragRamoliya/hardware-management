'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) {
      throw new Error(
        'SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters are required.',
      );
    }
    const [roles] = await queryInterface.sequelize.query(
      'SELECT `id` FROM `roles` WHERE `type` = ? AND `status` = 1 LIMIT 1',
      { replacements: ['super_admin'] },
    );
    const role = roles[0];
    if (!role) throw new Error('Seed the super_admin role before seeding the administrator.');
    const hash = await bcrypt.hash(password, 12);
    await queryInterface.sequelize.query(
      'INSERT INTO `users` (`role_id`, `first_name`, `last_name`, `email`, `password`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`), `first_name` = VALUES(`first_name`), `last_name` = VALUES(`last_name`), `password` = VALUES(`password`), `status` = 1',
      { replacements: [role.id, 'Super', 'Admin', email, hash] },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DELETE FROM `users` WHERE `email` = ? AND `role_id` IN (SELECT `id` FROM `roles` WHERE `type` = ?)',
      { replacements: [process.env.SUPER_ADMIN_EMAIL ?? '', 'super_admin'] },
    );
  },
};
