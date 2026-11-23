'use strict';

const crypto = require('node:crypto');

const rowCount = 20_000;
const batchSize = 1_000;

function encryptDevSecret(plaintext, aad, devKeyBuffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', devKeyBuffer, iv);
  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }
  const ciphertextBuffer = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertextBuffer.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: '1',
  };
}

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('The bulk credential seeder is only available when NODE_ENV=development.');
    }

    const [empRows] = await queryInterface.sequelize.query(
      'SELECT `id` FROM `employees` LIMIT 1000',
    );
    if (!empRows.length) {
      console.log('Skipping bulk credentials seed: no employees found.');
      return;
    }
    const [typeRows] = await queryInterface.sequelize.query(
      'SELECT `id` FROM `credential_types` LIMIT 10',
    );
    if (!typeRows.length) {
      console.log('Skipping bulk credentials seed: no credential types found.');
      return;
    }

    const devKeyBuffer = crypto
      .createHash('sha256')
      .update('dev-vault-encryption-key-fallback')
      .digest();

    for (let start = 1; start <= rowCount; start += batchSize) {
      const end = Math.min(start + batchSize - 1, rowCount);
      const now = new Date();
      const rows = [];

      for (let sequence = start; sequence <= end; sequence += 1) {
        const empId = empRows[sequence % empRows.length].id;
        const typeId = typeRows[sequence % typeRows.length].id;
        const suffix = String(sequence).padStart(6, '0');
        const aad = `credential:bulk-${suffix}:employee:${empId}`;
        const enc = encryptDevSecret(`DevSecret!${suffix}`, aad, devKeyBuffer);

        rows.push({
          employee_id: empId,
          credential_type_id: typeId,
          label: `LOADTEST-${suffix}`,
          username: `user_${suffix}@test.corp`,
          url: 'https://internal.tools.corp',
          password_enc: enc.ciphertext,
          iv: enc.iv,
          auth_tag: enc.authTag,
          key_version: enc.keyVersion,
          notes: 'Automated performance test credential',
          provided_by: sequence % 2 === 0 ? 1 : 2,
          approval_status: 2, // approved
          must_change_on_first_use: 0,
          status: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      await queryInterface.bulkInsert('credentials', rows);
    }
  },

  async down(queryInterface) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('The bulk credential seeder is only available when NODE_ENV=development.');
    }
    await queryInterface.bulkDelete('credentials', {
      label: { [require('sequelize').Op.like]: 'LOADTEST-%' },
    });
  },
};
