import { sequelize, app_settings, employees, requests } from '../Database/Schema';
import { STATUS } from '@hm/shared';

async function seedBulkRequests() {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: seed:requests-bulk is forbidden in production environment.');
    process.exit(1);
  }

  console.log('--- Starting Phase 4: Bulk Requests Seeder (20,000 items) ---');

  // 1. Check idempotency marker
  const marker = await app_settings.findOne({
    where: { key: 'seed_requests_bulk_completed', status: STATUS.ACTIVE },
  });

  const existingCount = await requests.count();
  if (marker || existingCount >= 20000) {
    console.log(
      `Idempotency marker found or table already has ${existingCount} requests. Skipping duplicate bulk seed.`,
    );
    process.exit(0);
  }

  // 2. Fetch employee IDs for realistic foreign keys
  const empRecords = await employees.findAll({
    attributes: ['id'],
    where: { status: STATUS.ACTIVE },
    limit: 500,
  });

  const empIds = empRecords.map((e) => Number(e.get('id')));
  if (empIds.length === 0) {
    console.error('No employees found to associate requests with. Please run base seeders first.');
    process.exit(1);
  }

  const TOTAL_COUNT = 20000;
  const CHUNK_SIZE = 1000;
  const now = new Date();

  console.log(
    `Seeding ${TOTAL_COUNT} requests across ${empIds.length} employees in batches of ${CHUNK_SIZE}...`,
  );

  const requestTypes = [1, 2, 3, 4, 5]; // new_hardware, upgrade, repair, new_software, return
  const priorities = [1, 2, 3, 4]; // low, medium, high, urgent
  const statuses = [1, 2, 3, 4, 5]; // submitted, under_review, approved, in_fulfilment, fulfilled

  for (let offset = 0; offset < TOTAL_COUNT; offset += CHUNK_SIZE) {
    const chunk: Array<Record<string, unknown>> = [];
    const batchLimit = Math.min(offset + CHUNK_SIZE, TOTAL_COUNT);

    for (let i = offset; i < batchLimit; i++) {
      const empId = empIds[i % empIds.length];
      const reqType = requestTypes[i % requestTypes.length];
      const priority = priorities[i % priorities.length];
      const statusVal = statuses[i % statuses.length];
      const reqNo = `REQ-BULK-${String(i + 1).padStart(6, '0')}`;

      chunk.push({
        request_no: reqNo,
        employee_id: empId,
        request_type: reqType,
        category_id: null,
        current_asset_id: null,
        software_id: null,
        title: `Bulk Test Equipment Request #${i + 1}`,
        reason: 'Automated performance test request for SLA and queue latency benchmarking.',
        priority,
        needed_by_date: '2026-12-01',
        request_status: statusVal,
        assigned_to: 1,
        reviewed_by: Number(statusVal) > 1 ? 1 : null,
        reviewed_at: Number(statusVal) > 1 ? now : null,
        awaiting_stock: i % 10 === 0 ? 1 : 0,
        sla_breached: i % 20 === 0 ? 1 : 0,
        status: STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now,
      });
    }

    await sequelize.getQueryInterface().bulkInsert('requests', chunk);
    process.stdout.write(`Inserted ${batchLimit} / ${TOTAL_COUNT} requests...\r`);
  }

  console.log(`\nSuccessfully seeded ${TOTAL_COUNT} requests.`);

  // 3. Set idempotency marker
  await app_settings.upsert({
    key: 'seed_requests_bulk_completed',
    value: String(TOTAL_COUNT),
    description: 'Marker indicating Phase 4 20,000 bulk requests seeded successfully.',
    status: STATUS.ACTIVE,
    updated_by: 1,
  });

  console.log('Idempotency marker recorded in app_settings.');
  process.exit(0);
}

seedBulkRequests().catch((err) => {
  console.error('Fatal error during bulk request seed:', err);
  process.exit(1);
});
