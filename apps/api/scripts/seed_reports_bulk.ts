import crypto from 'node:crypto';
import {
  employees,
  assets,
  vendors,
  software,
  software_licenses,
  asset_maintenance,
  activity_logs,
} from '../Database/Schema';
import { STATUS } from '@hm/shared';

async function seedReportsBulk() {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: seed_reports_bulk is forbidden in production.');
    process.exit(1);
  }

  console.log('=== Starting Phase 6: Bulk Reports Performance Dataset Seeder ===');

  const [empCount, assetCount, vendorCount] = await Promise.all([
    employees.count(),
    assets.count(),
    vendors.count(),
  ]);

  console.log(
    `Existing base dataset: ${empCount} employees, ${assetCount} assets, ${vendorCount} vendors.`,
  );

  const assetList = await assets.findAll({
    attributes: ['id', 'category_id'],
    limit: 3000,
    raw: true,
  });
  const vendorList = await vendors.findAll({ attributes: ['id'], raw: true });

  const vendorIds = vendorList.map((v: any) => Number(v.id));
  const defaultVendorId = vendorIds.length > 0 ? vendorIds[0] : 1;

  // 1. Seed Software & Licenses (Target: >= 1,500 software apps)
  const currentSoftwareCount = await software.count();
  if (currentSoftwareCount < 1500) {
    const toCreate = 1500 - currentSoftwareCount;
    console.log(`Seeding ${toCreate} software titles and licenses in chunks...`);
    const softwareCategories = [
      'Developer Tools',
      'Productivity',
      'Design',
      'Security',
      'Infrastructure',
      'Finance',
    ];
    const licenseTypes = ['per_seat', 'per_user', 'subscription', 'perpetual', 'free'];

    const CHUNK_SIZE = 500;
    for (let i = 0; i < toCreate; i += CHUNK_SIZE) {
      const batchSize = Math.min(CHUNK_SIZE, toCreate - i);
      const swRows = [];
      const now = new Date();

      for (let j = 0; j < batchSize; j++) {
        const idx = currentSoftwareCount + i + j + 1;
        const vId = vendorIds[idx % vendorIds.length] || defaultVendorId;
        const cat = softwareCategories[idx % softwareCategories.length];
        const lType = licenseTypes[idx % licenseTypes.length];
        const renewal = new Date(now.getTime() + (idx % 365) * 86400000);

        swRows.push({
          name: `Software Application ${idx}`,
          vendor_id: vId,
          category: cat,
          license_type: lType,
          cost: 299.99 + (idx % 500),
          billing_cycle: 'Annual',
          renewal_date: renewal.toISOString().slice(0, 10),
          status: STATUS.ACTIVE,
          createdAt: now,
          updatedAt: now,
        });
      }

      const createdSoftware = await software.bulkCreate(swRows as any[], { returning: true });
      const licRows = [];
      for (const sw of createdSoftware) {
        licRows.push({
          software_id: sw.get('id'),
          license_key: `KEY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          seats_total: 10 + (Number(sw.get('id')) % 50),
          purchase_date: '2025-01-15',
          expiry_date: '2027-01-15',
          status: STATUS.ACTIVE,
          createdAt: now,
          updatedAt: now,
        });
      }
      await software_licenses.bulkCreate(licRows as any[]);
    }
    console.log(`Software seeded. Total: ${await software.count()}`);
  } else {
    console.log(`Software count already at ${currentSoftwareCount} (>= 1,500). Skipping.`);
  }

  // 2. Seed Maintenance Records (Target: >= 3,000 maintenance tickets)
  const currentMaintCount = await asset_maintenance.count();
  if (currentMaintCount < 3000) {
    const toCreate = 3000 - currentMaintCount;
    console.log(`Seeding ${toCreate} asset maintenance records in chunks...`);
    const issues = [
      'Battery replacement needed',
      'Screen flickering and dead pixels',
      'Keyboard keys not responding',
      'Overheating under load and thermal throttling',
      'Trackpad unresponsive after liquid exposure',
      'SSD storage controller failure',
      'Operating system kernel panic on boot',
    ];

    const CHUNK_SIZE = 1000;
    const now = new Date();
    for (let i = 0; i < toCreate; i += CHUNK_SIZE) {
      const batchSize = Math.min(CHUNK_SIZE, toCreate - i);
      const maintRows = [];

      for (let j = 0; j < batchSize; j++) {
        const idx = currentMaintCount + i + j;
        const ast = assetList[idx % assetList.length];
        const vId = vendorIds[idx % vendorIds.length] || defaultVendorId;
        const issue = issues[idx % issues.length];
        const isResolved = idx % 3 !== 0;
        const sentDaysAgo = (idx % 60) + 1;
        const sentAt = new Date(now.getTime() - sentDaysAgo * 86400000);
        const returnedAt = isResolved
          ? new Date(sentAt.getTime() + ((idx % 14) + 1) * 86400000)
          : null;

        maintRows.push({
          asset_id: ast ? (ast as any).id : 1,
          issue,
          vendor_id: vId,
          cost: 150.0 + (idx % 800),
          sent_at: sentAt,
          returned_at: returnedAt,
          resolution: isResolved ? 'Component repaired and bench tested successfully' : null,
          maintenance_status: isResolved ? 2 : 1,
          status: STATUS.ACTIVE,
          createdAt: sentAt,
          updatedAt: returnedAt || sentAt,
        });
      }

      await asset_maintenance.bulkCreate(maintRows as any[]);
    }
    console.log(`Maintenance seeded. Total: ${await asset_maintenance.count()}`);
  } else {
    console.log(`Maintenance count already at ${currentMaintCount} (>= 3,000). Skipping.`);
  }

  // 3. Seed Activity Logs (Target: >= 100,000 audit logs)
  const currentLogCount = await activity_logs.count();
  if (currentLogCount < 100000) {
    const toCreate = 100000 - currentLogCount;
    console.log(
      `Seeding ${toCreate} activity audit logs in batches with cryptographic hash chaining...`,
    );

    const modules = [
      'asset',
      'employee',
      'software',
      'request',
      'offboarding',
      'credential',
      'auth',
    ];
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'];
    const users = ['System Admin', 'Hardware Manager', 'HR Executive', 'Security Officer'];

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const lastRow = await activity_logs.findOne({ order: [['id', 'DESC']], attributes: ['hash'] });
    if (lastRow && (lastRow as any).hash) {
      prevHash = (lastRow as any).hash;
    }

    const CHUNK_SIZE = 1000;
    const now = new Date();
    for (let i = 0; i < toCreate; i += CHUNK_SIZE) {
      const batchSize = Math.min(CHUNK_SIZE, toCreate - i);
      const logRows = [];

      for (let j = 0; j < batchSize; j++) {
        const idx = currentLogCount + i + j + 1;
        const mod = modules[idx % modules.length];
        const act = actions[idx % actions.length];
        const actor = users[idx % users.length];
        const desc = `${act} operation executed on ${mod} record #${(idx * 7) % 50000}`;
        const logTime = new Date(now.getTime() - idx * 60000);

        const payload = `${prevHash}|${mod}|${act}|${desc}|${logTime.toISOString()}`;
        const currHash = crypto.createHash('sha256').update(payload).digest('hex');

        logRows.push({
          module: mod,
          module_id: (idx * 7) % 50000,
          action: act,
          field: act === 'UPDATE' ? 'status' : null,
          old_value: act === 'UPDATE' ? { status: 1 } : null,
          new_value: act === 'UPDATE' ? { status: 2 } : null,
          description: desc,
          created_by_name: actor,
          prev_hash: prevHash,
          hash: currHash,
          status: STATUS.ACTIVE,
          createdAt: logTime,
          updatedAt: logTime,
        });

        prevHash = currHash;
      }

      await activity_logs.bulkCreate(logRows as any[]);
      if ((i + batchSize) % 25000 === 0 || i + batchSize === toCreate) {
        console.log(`Progress: ${i + batchSize} / ${toCreate} activity logs inserted...`);
      }
    }
    console.log(`Activity logs seeded. Total: ${await activity_logs.count()}`);
  } else {
    console.log(`Activity logs count already at ${currentLogCount} (>= 100,000). Skipping.`);
  }

  console.log('=== Phase 6 Bulk Performance Dataset Seeding Complete ===');
  process.exit(0);
}

seedReportsBulk().catch((err) => {
  console.error('Fatal error in seedReportsBulk:', err);
  process.exit(1);
});
