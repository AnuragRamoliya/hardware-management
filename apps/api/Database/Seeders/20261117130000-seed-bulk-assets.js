'use strict';

const rowCount = 100_000;
const batchSize = 1_000;
const conditions = ['new', 'good', 'fair', 'poor'];

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV !== 'development')
      throw new Error('The bulk asset seeder is only available when NODE_ENV=development.');
    for (let start = 1; start <= rowCount; start += batchSize) {
      const end = Math.min(start + batchSize - 1, rowCount);
      const now = new Date();
      const rows = [];
      for (let sequence = start; sequence <= end; sequence += 1) {
        const suffix = String(sequence).padStart(6, '0');
        rows.push({
          asset_tag: `AST-${suffix}`,
          serial_no: `LOADTEST-${suffix}`,
          brand: ['Lenovo', 'Dell', 'HP', 'Apple'][sequence % 4],
          model: ['ThinkPad T14', 'Latitude 5450', 'EliteBook 840', 'MacBook Pro'][sequence % 4],
          condition: conditions[sequence % conditions.length],
          asset_status: sequence % 10 < 7 ? 1 : sequence % 2 ? 4 : 5,
          purchase_date: '2024-01-01',
          warranty_end: '2027-01-01',
          specs: JSON.stringify({ memory: `${8 + (sequence % 4) * 8} GB`, storage: '512 GB' }),
          notes: 'Bulk load test asset',
          status: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
      await queryInterface.bulkInsert('assets', rows, {
        updateOnDuplicate: [
          'serial_no',
          'brand',
          'model',
          'condition',
          'asset_status',
          'purchase_date',
          'warranty_end',
          'specs',
          'notes',
          'status',
        ],
      });
    }
  },
  async down(queryInterface) {
    if (process.env.NODE_ENV !== 'development')
      throw new Error('The bulk asset seeder is only available when NODE_ENV=development.');
    await queryInterface.bulkDelete('assets', {
      serial_no: { [require('sequelize').Op.like]: 'LOADTEST-%' },
    });
  },
};
