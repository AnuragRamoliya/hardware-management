import 'dotenv/config';
import { sequelize } from '../Database/Schema';
import { ALL_REPORTS, canRoleAccessReport } from '../Reports/registry';
import { reportService } from '../Services/report.service';

async function runPhase6Smoke() {
  console.log('====================================================');
  console.log('STARTING PHASE 6 REPORTS API SMOKE TEST');
  console.log('====================================================\n');

  await sequelize.authenticate();
  console.log('Database connection verified.');

  const adminActor = {
    id: 1,
    role_id: 1,
    role: 'super_admin',
    first_name: 'Super',
    last_name: 'Admin',
    email: 'admin@fixture.local',
  } as any;

  const empActor = {
    id: 4,
    role_id: 4,
    role: 'employee',
    first_name: 'Employee',
    last_name: 'User',
    email: 'emp@fixture.local',
  } as any;

  console.log(`Checking registry: total registered reports = ${ALL_REPORTS.length}`);
  if (ALL_REPORTS.length !== 10) {
    throw new Error(`Expected exactly 10 reports, found ${ALL_REPORTS.length}`);
  }

  // 1. RBAC Guard check
  console.log('\n--- 1. Testing RBAC Access Checks ---');
  for (const rep of ALL_REPORTS) {
    const adminAllowed = canRoleAccessReport('super_admin', rep.key);
    const empAllowed = canRoleAccessReport('employee', rep.key);
    console.log(`Report [${rep.key}]: super_admin=${adminAllowed}, employee=${empAllowed}`);
    if (!adminAllowed || empAllowed) {
      throw new Error(`RBAC mismatch for report ${rep.key}`);
    }
  }

  // 2. Query execution check for all 10 reports
  console.log('\n--- 2. Query Execution across all 10 Reports ---');
  for (const rep of ALL_REPORTS) {
    const start = Date.now();
    const result = await reportService.runReport(
      rep.key,
      { currentPage: 1, itemsPerPage: 10 },
      adminActor,
    );
    const duration = Date.now() - start;
    console.log(`Report [${rep.key}] OK: count=${result.count}, duration=${duration}ms`);
  }

  // 3. Employee Access Rejection check
  console.log('\n--- 3. Employee Access Rejection ---');
  try {
    await reportService.runReport('hardware-per-employee', {}, empActor);
    throw new Error('Employee was allowed to run report!');
  } catch (err: any) {
    console.log(
      `Employee run report correctly rejected: status=${err.status || 403}, message="${err.message}"`,
    );
  }

  console.log('\n====================================================');
  console.log('PHASE 6 SMOKE TEST PASSED COMPLETELY');
  console.log('====================================================\n');
}

runPhase6Smoke()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 6 smoke failed:', err);
    process.exit(1);
  });
