'use strict';

const firstNames = [
  'Aarav',
  'Aditi',
  'Ananya',
  'Arjun',
  'Diya',
  'Ishaan',
  'Kavya',
  'Maya',
  'Neha',
  'Rohan',
  'Saanvi',
  'Vikram',
  'Zara',
  'Adrian',
  'Amelia',
  'Daniel',
  'Elena',
  'Ethan',
  'Grace',
  'Lucas',
];
const lastNames = [
  'Shah',
  'Patel',
  'Mehta',
  'Rao',
  'Sharma',
  'Kapoor',
  'Desai',
  'Nair',
  'Singh',
  'Iyer',
  'Brown',
  'Chen',
  'Davis',
  'Garcia',
  'Johnson',
  'Kim',
  'Martin',
  'Miller',
  'Wilson',
  'Wong',
];
const rowCount = 100_000;
const batchSize = 1_000;

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('The bulk employee seeder is only available when NODE_ENV=development.');
    }

    for (let start = 1; start <= rowCount; start += batchSize) {
      const end = Math.min(start + batchSize - 1, rowCount);
      const now = new Date();
      const employees = [];
      for (let sequence = start; sequence <= end; sequence += 1) {
        const firstName = firstNames[(sequence - 1) % firstNames.length];
        const lastName =
          lastNames[Math.floor((sequence - 1) / firstNames.length) % lastNames.length];
        const suffix = String(sequence).padStart(6, '0');
        employees.push({
          employee_code: `LOADTEST-${suffix}`,
          first_name: firstName,
          last_name: lastName,
          email: `loadtest.${suffix}@itam.local`,
          employment_status: 1,
          status: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      await queryInterface.bulkInsert('employees', employees, {
        updateOnDuplicate: ['first_name', 'last_name', 'email', 'employment_status', 'status'],
      });
    }
  },

  async down(queryInterface) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('The bulk employee seeder is only available when NODE_ENV=development.');
    }
    await queryInterface.bulkDelete(
      'employees',
      { employee_code: { [require('sequelize').Op.like]: 'LOADTEST-%' } },
      {},
    );
  },
};
