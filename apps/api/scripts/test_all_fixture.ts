import { ALL_REPORTS, getReport, canRoleAccessReport } from '../Reports/registry';
import { reportService } from '../Services/report.service';
import { exportReportToCsv } from '../Reports/exporters/csv_exporter';
import { exportReportToXlsx } from '../Reports/exporters/xlsx_exporter';
import { exportReportToPdf } from '../Reports/exporters/pdf_exporter';
import { Writable } from 'node:stream';

async function runFixtureTests() {
  console.log('=== Running Full System Test Fixture & Verification Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  const superAdmin = {
    id: 1,
    first_name: 'Admin',
    last_name: 'Super',
    email: 'admin@test.com',
    role: 'super_admin',
  } as any;
  const _hwManager = {
    id: 2,
    first_name: 'HW',
    last_name: 'Manager',
    email: 'hw@test.com',
    role: 'hardware_manager',
  } as any;
  const hrUser = {
    id: 3,
    first_name: 'HR',
    last_name: 'User',
    email: 'hr@test.com',
    role: 'hr',
  } as any;
  const employeeUser = {
    id: 4,
    first_name: 'Emp',
    last_name: 'User',
    email: 'emp@test.com',
    role: 'employee',
  } as any;

  // 1. Report Registry Completeness
  console.log('1. Verifying Registry:');
  assert(ALL_REPORTS.length === 10, 'Registry contains exactly 10 report definitions');

  // 2. Role Permissions Matrix
  console.log('\n2. Verifying Role Access Matrix:');
  for (const r of ALL_REPORTS) {
    assert(canRoleAccessReport('super_admin', r.key), `super_admin can access ${r.key}`);
    assert(!canRoleAccessReport('employee', r.key), `employee is blocked from ${r.key}`);
  }
  assert(
    canRoleAccessReport('hardware_manager', 'hardware-per-employee'),
    'hardware_manager can access hardware-per-employee',
  );
  assert(
    !canRoleAccessReport('hardware_manager', 'credential-approvals-access'),
    'hardware_manager is blocked from credential-approvals-access',
  );
  assert(
    !canRoleAccessReport('hardware_manager', 'audit-export'),
    'hardware_manager is blocked from audit-export',
  );
  assert(canRoleAccessReport('hr', 'offboarding-status'), 'hr can access offboarding-status');
  assert(
    canRoleAccessReport('hr', 'request-turnaround-sla'),
    'hr can access request-turnaround-sla',
  );
  assert(
    !canRoleAccessReport('hr', 'software-license-utilization'),
    'hr is blocked from software-license-utilization',
  );

  // 3. Golden Data Checks on all 10 Reports
  console.log('\n3. Golden Data Verification for 10 Reports:');

  const { employees, asset_categories, software } = await import('../Database/Schema');
  const fixEmp = await employees.findOne({ where: { employee_code: 'FIX-EMP-001' } });
  const fixCat = await asset_categories.findOne({ where: { name: 'Fixture Laptops' } });
  const fixSwRecord = await software.findOne({ where: { name: 'Fixture IDE Enterprise' } });

  // R1: Hardware Per Employee
  const r1 = await reportService.runReport(
    'hardware-per-employee',
    { filters: { employee_id: fixEmp?.get('id') } },
    superAdmin,
  );
  const fixEmpRow = r1.rows.find((row: any) => row.employee_code === 'FIX-EMP-001');
  assert(r1.count > 0, `R1: hardware-per-employee returns rows (count=${r1.count})`);
  assert(
    !!fixEmpRow && fixEmpRow.asset_tag === 'TAG-FIX-001',
    'R1: FIX-EMP-001 is mapped to TAG-FIX-001',
  );

  // R2: Assets by Category and Department
  const r2 = await reportService.runReport(
    'assets-by-category-department',
    { filters: { category_id: fixCat?.get('id') } },
    superAdmin,
  );
  const fixCatRow = r2.rows.find((row: any) => row.category === 'Fixture Laptops');
  assert(r2.count > 0, `R2: assets-by-category-department returns groups (count=${r2.count})`);
  assert(!!fixCatRow, 'R2: Fixture Laptops category group is present');

  // R3: Assigned vs Unassigned
  const r3 = await reportService.runReport(
    'assigned-vs-unassigned',
    { filters: { category_id: fixCat?.get('id') }, itemsPerPage: 50 },
    superAdmin,
  );
  const assignedFix = r3.rows.find((row: any) => row.asset_tag === 'TAG-FIX-001');
  const unassignedFix = r3.rows.find((row: any) => row.asset_tag === 'TAG-FIX-002');
  assert(
    !!assignedFix && assignedFix.assignment_status === 'assigned',
    'R3: TAG-FIX-001 shows assignment_status = assigned',
  );
  assert(
    !!unassignedFix && unassignedFix.assignment_status === 'unassigned',
    'R3: TAG-FIX-002 shows assignment_status = unassigned',
  );

  // R4: Software License Utilization
  const r4 = await reportService.runReport(
    'software-license-utilization',
    { filters: { software_id: fixSwRecord?.get('id') } },
    superAdmin,
  );
  const fixSw = r4.rows.find((row: any) => row.software_name === 'Fixture IDE Enterprise');
  assert(!!fixSw, 'R4: Fixture IDE Enterprise found');
  assert(
    fixSw?.seats_total === 10 && Number(fixSw?.seats_assigned) >= 1,
    'R4: Total seats=10 and seats_assigned>=1',
  );

  // R5: Warranty Expiry
  const r5 = await reportService.runReport(
    'warranty-expiry',
    { filters: { window_days: 'all', category_id: fixCat?.get('id') } },
    superAdmin,
  );
  const fixExpired = r5.rows.find((row: any) => row.asset_tag === 'TAG-FIX-003');
  assert(!!fixExpired, 'R5: TAG-FIX-003 is tracked');
  assert(fixExpired?.warranty_status === 'expired', 'R5: TAG-FIX-003 is correctly marked expired');

  // R6: Repair History
  const r6 = await reportService.runReport(
    'repair-history',
    { filters: { start_date: '2026-11-10', end_date: '2026-11-10' }, itemsPerPage: 50 },
    superAdmin,
  );
  const fixMaint = r6.rows.find((row: any) => row.asset_tag === 'TAG-FIX-003');
  assert(!!fixMaint, 'R6: Maintenance record for TAG-FIX-003 found');
  assert(Number(fixMaint?.cost) === 350, 'R6: Repair cost matches 350.00');

  // R7: Request Turnaround SLA
  const r7 = await reportService.runReport(
    'request-turnaround-sla',
    { filters: { start_date: '2026-11-18', end_date: '2026-11-18' }, itemsPerPage: 100 },
    superAdmin,
  );
  const fixReq = r7.rows.find((row: any) => row.request_no === 'REQ-FIX-001');
  assert(!!fixReq, 'R7: REQ-FIX-001 found in turnaround SLA report');
  assert(fixReq?.status_label === 'fulfilled', 'R7: Status is fulfilled');
  assert(fixReq?.sla_breached === 'within_sla', 'R7: SLA breach status is within_sla');

  // R8: Offboarding Status
  const r8 = await reportService.runReport(
    'offboarding-status',
    { filters: { start_date: '2026-11-30', end_date: '2026-11-30' }, itemsPerPage: 100 },
    superAdmin,
  );
  const fixOff = r8.rows.find((row: any) => row.case_no === 'OFF-FIX-001');
  assert(!!fixOff, 'R8: OFF-FIX-001 found in offboarding status report');
  assert(Number(fixOff?.pending_assets_count) >= 1, 'R8: Pending assets return count >= 1');

  // R9: Credential Approvals & Access (ZERO SECRETS LEAK CHECK)
  const r9 = await reportService.runReport('credential-approvals-access', {}, superAdmin);
  const fixCred = r9.rows.find((row: any) => row.label === 'Fixture Production API Token');
  assert(!!fixCred, 'R9: Fixture Production API Token metadata found');
  assert(fixCred?.approval_status === 'approved', 'R9: Approval status is approved');
  assert(Number(fixCred?.reveal_count) >= 1, 'R9: Access reveal count >= 1');

  // CRITICAL SECURITY ASSERTION
  for (const row of r9.rows) {
    const rawKeys = Object.keys(row);
    assert(
      !rawKeys.includes('password_enc'),
      'R9 Security: password_enc is absent from output row',
    );
    assert(!rawKeys.includes('iv'), 'R9 Security: iv is absent from output row');
    assert(!rawKeys.includes('auth_tag'), 'R9 Security: auth_tag is absent from output row');
    assert(!rawKeys.includes('key_version'), 'R9 Security: key_version is absent from output row');
  }

  // R10: Audit Export & Hash Chain
  const r10 = await reportService.runReport('audit-export', {}, superAdmin);
  const fixAudit = r10.rows.find((row: any) =>
    (row.description as string)?.includes('DETERMINISTIC_FIXTURE'),
  );
  assert(!!fixAudit, 'R10: Deterministic audit log entry found');
  assert(
    fixAudit?.is_chain_valid === 'verified',
    'R10: Audit cryptographic hash chain is verified',
  );

  // 4. Exporters Verification
  console.log('\n4. Verifying CSV, XLSX, and PDF Exporters:');

  // CSV
  let csvData = '';
  const csvStream = new Writable({
    write(chunk, enc, cb) {
      csvData += chunk.toString();
      cb();
    },
  });
  const csvRes = await exportReportToCsv({
    report: getReport('hardware-per-employee')!,
    stream: getReport('hardware-per-employee')!.stream({}, superAdmin),
    output: csvStream,
  });
  assert(csvRes.rowCount > 0, `CSV export completed with ${csvRes.rowCount} rows`);
  assert(csvData.startsWith('\uFEFF'), 'CSV output begins with UTF-8 BOM');
  assert(csvData.includes('"Employee","Employee Code"'), 'CSV header row formatted properly');

  // XLSX
  let xlsxLength = 0;
  const xlsxStream = new Writable({
    write(chunk, enc, cb) {
      xlsxLength += chunk.length;
      cb();
    },
  });
  const xlsxRes = await exportReportToXlsx({
    report: getReport('hardware-per-employee')!,
    stream: getReport('hardware-per-employee')!.stream({}, superAdmin),
    output: xlsxStream,
    summary: r1.summary,
  });
  assert(xlsxRes.rowCount > 0, `XLSX export completed with ${xlsxRes.rowCount} rows`);
  assert(xlsxLength > 1000, `XLSX binary stream generated (${xlsxLength} bytes)`);

  // PDF
  let pdfLength = 0;
  const pdfStream = new Writable({
    write(chunk, enc, cb) {
      pdfLength += chunk.length;
      cb();
    },
  });
  const pdfRes = await exportReportToPdf({
    report: getReport('hardware-per-employee')!,
    stream: getReport('hardware-per-employee')!.stream({}, superAdmin),
    output: pdfStream,
    summary: r1.summary,
    maxPdfRows: 100,
  });
  assert(pdfRes.rowCount > 0, `PDF export completed with ${pdfRes.rowCount} rows`);
  assert(pdfLength > 1000, `PDF binary stream generated (${pdfLength} bytes)`);

  // 5. Forbidden Access Enforcement
  console.log('\n5. Verifying 403 Forbidden Access Enforcement:');
  try {
    await reportService.runReport('audit-export', {}, hrUser);
    assert(false, 'HR accessing audit-export should throw 403');
  } catch (err: any) {
    assert(err.status === 403, 'HR accessing audit-export returned 403 Forbidden');
  }

  try {
    await reportService.runReport('hardware-per-employee', {}, employeeUser);
    assert(false, 'Employee accessing hardware-per-employee should throw 403');
  } catch (err: any) {
    assert(err.status === 403, 'Employee accessing hardware-per-employee returned 403 Forbidden');
  }

  console.log(`\n=== Verification Summary: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runFixtureTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
