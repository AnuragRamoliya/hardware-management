import bcrypt from 'bcrypt';
import {
  users,
  employees,
  departments,
  designations,
  locations,
  asset_categories,
  assets,
  asset_assignments,
  software,
  software_licenses,
  software_assignments,
  asset_maintenance,
  requests,
  offboarding_cases,
  offboarding_tasks,
  credential_types,
  credentials,
  credential_access_logs,
  activity_logs,
  vendors,
} from '../Database/Schema';
import { STATUS, ASSET_STATUS } from '@hm/shared';
import { computeRowHash, GENESIS_HASH } from '../Utils/hash_chain';

const FIXTURE_DATE = new Date('2026-11-20T10:00:00.000Z');

async function seedTestFixture() {
  console.log('=== Seeding Deterministic Test Fixture for Full-System Verification ===');

  const now = FIXTURE_DATE;

  // 0. Seed deterministic users for all 4 roles
  const testPasswordHash = await bcrypt.hash('TestPassword123!', 10);
  const fixtureUsers = [
    { email: 'admin@fixture.local', first_name: 'Admin', last_name: 'Fixture', role_id: 1 },
    { email: 'hw@fixture.local', first_name: 'HW', last_name: 'Manager', role_id: 2 },
    { email: 'hr@fixture.local', first_name: 'HR', last_name: 'Specialist', role_id: 3 },
    { email: 'emp@fixture.local', first_name: 'Emp', last_name: 'Fixture', role_id: 4 },
  ];

  let empUserRowId: number = 1;
  for (const u of fixtureUsers) {
    let userRow = await users.findOne({ where: { email: u.email } });
    if (!userRow) {
      userRow = await users.create({
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        password: testPasswordHash,
        role_id: u.role_id,
        status: STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (u.email === 'emp@fixture.local') {
      empUserRowId = Number(userRow.get('id'));
    }
  }

  // 1. Department & Designation
  let dept = await departments.findOne({ where: { name: 'Engineering Fixture' } });
  if (!dept) {
    dept = await departments.create({
      name: 'Engineering Fixture',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const deptId = Number(dept.get('id'));

  let desig = await designations.findOne({ where: { name: 'Fixture Staff' } });
  if (!desig) {
    desig = await designations.create({
      name: 'Fixture Staff',
      department_id: deptId,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const desigId = Number(desig.get('id'));

  let loc = await locations.findOne({ where: { name: 'Fixture HQ' } });
  if (!loc) {
    loc = await locations.create({
      name: 'Fixture HQ',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const locId = Number(loc.get('id'));

  let vend = await vendors.findOne({ where: { name: 'Fixture Tech Solutions' } });
  if (!vend) {
    vend = await vendors.create({
      name: 'Fixture Tech Solutions',
      contact_person: 'John Fixture',
      email: 'vendor@fixture.com',
      phone: '555-0199',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const vendId = Number(vend.get('id'));

  // 2. Employees
  let emp1 = await employees.findOne({ where: { employee_code: 'FIX-EMP-001' } });
  if (!emp1) {
    emp1 = await employees.create({
      employee_code: 'FIX-EMP-001',
      first_name: 'Alice',
      last_name: 'Fixture',
      email: 'alice.fixture@example.com',
      user_id: empUserRowId,
      department_id: deptId,
      designation_id: desigId,
      location_id: locId,
      joining_date: '2024-01-15',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  } else if (!emp1.get('user_id')) {
    await emp1.update({ user_id: empUserRowId });
  }
  const emp1Id = Number(emp1.get('id'));

  let emp2 = await employees.findOne({ where: { employee_code: 'FIX-EMP-002' } });
  if (!emp2) {
    emp2 = await employees.create({
      employee_code: 'FIX-EMP-002',
      first_name: 'Bob',
      last_name: 'Fixture',
      email: 'bob.fixture@example.com',
      department_id: deptId,
      designation_id: desigId,
      location_id: locId,
      joining_date: '2024-06-01',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const emp2Id = Number(emp2.get('id'));

  // 3. Asset Category & Assets
  let cat = await asset_categories.findOne({ where: { name: 'Fixture Laptops' } });
  if (!cat) {
    cat = await asset_categories.create({
      name: 'Fixture Laptops',
      code: 'FIX-LAP',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const catId = Number(cat.get('id'));

  // Asset 1: Assigned to Alice
  let asset1 = await assets.findOne({ where: { asset_tag: 'TAG-FIX-001' } });
  if (!asset1) {
    asset1 = await assets.create({
      asset_tag: 'TAG-FIX-001',
      serial_no: 'SN-FIX-001',
      category_id: catId,
      brand: 'Dell',
      model: 'Latitude 7420 Fixture',
      vendor_id: vendId,
      location_id: locId,
      purchase_date: '2024-01-10',
      purchase_cost: 1450.0,
      warranty_start: '2024-01-10',
      warranty_end: '2027-01-10',
      condition: 'good',
      asset_status: ASSET_STATUS.ASSIGNED,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const assign1 = await asset_assignments.findOne({
    where: { asset_id: Number(asset1.get('id')), returned_at: null },
  });
  if (!assign1) {
    await asset_assignments.create({
      asset_id: Number(asset1.get('id')),
      employee_id: emp1Id,
      assigned_at: '2024-01-20T10:00:00.000Z',
      assigned_by: 1,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Asset 2: Available in stock
  let asset2 = await assets.findOne({ where: { asset_tag: 'TAG-FIX-002' } });
  if (!asset2) {
    asset2 = await assets.create({
      asset_tag: 'TAG-FIX-002',
      serial_no: 'SN-FIX-002',
      category_id: catId,
      brand: 'Dell',
      model: 'Latitude 7420 Fixture',
      vendor_id: vendId,
      location_id: locId,
      purchase_date: '2024-02-01',
      purchase_cost: 1450.0,
      warranty_start: '2024-02-01',
      warranty_end: '2027-02-01',
      condition: 'new',
      asset_status: ASSET_STATUS.AVAILABLE,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Asset 3: Under Repair
  let asset3 = await assets.findOne({ where: { asset_tag: 'TAG-FIX-003' } });
  if (!asset3) {
    asset3 = await assets.create({
      asset_tag: 'TAG-FIX-003',
      serial_no: 'SN-FIX-003',
      category_id: catId,
      brand: 'Apple',
      model: 'MacBook Pro 14 Fixture',
      vendor_id: vendId,
      location_id: locId,
      purchase_date: '2023-11-15',
      purchase_cost: 2199.0,
      warranty_start: '2023-11-15',
      warranty_end: '2026-11-15', // Expired warranty!
      condition: 'poor',
      asset_status: ASSET_STATUS.IN_REPAIR,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const fixMaintRecord = await asset_maintenance.findOne({
    where: { asset_id: Number(asset3.get('id')) },
  });
  if (!fixMaintRecord) {
    await asset_maintenance.create({
      asset_id: Number(asset3.get('id')),
      issue: 'Battery swelling and keyboard replacement',
      vendor_id: vendId,
      cost: 350.0,
      sent_at: '2026-11-10T10:00:00.000Z',
      returned_at: null,
      maintenance_status: 1, // under repair
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 4. Software & License
  let sw = await software.findOne({ where: { name: 'Fixture IDE Enterprise' } });
  if (!sw) {
    sw = await software.create({
      name: 'Fixture IDE Enterprise',
      vendor_id: vendId,
      category: 'Developer Tools',
      license_type: 'per_seat',
      cost: 499.0,
      billing_cycle: 'Annual',
      renewal_date: '2027-05-01',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const swId = Number(sw.get('id'));
  let lic = await software_licenses.findOne({ where: { software_id: swId } });
  if (!lic) {
    lic = await software_licenses.create({
      software_id: swId,
      license_key: 'KEY-FIXTURE-DEV-9999',
      seats_total: 10,
      purchase_date: '2025-05-01',
      expiry_date: '2027-05-01',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const swAssign = await software_assignments.findOne({
    where: { software_id: swId, employee_id: emp1Id },
  });
  if (!swAssign) {
    await software_assignments.create({
      software_id: swId,
      license_id: Number(lic.get('id')),
      employee_id: emp1Id,
      assigned_at: now,
      assigned_by: 1,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 5. Request with SLA
  let req = await requests.findOne({ where: { request_no: 'REQ-FIX-001' } });
  if (!req) {
    req = await requests.create({
      request_no: 'REQ-FIX-001',
      employee_id: emp1Id,
      request_type: 1, // Hardware allocation
      category_id: catId,
      title: 'Secondary monitor for development workstation',
      reason: 'Dual display required for backend and frontend debugging',
      priority: 2, // Medium
      request_status: 5, // Fulfilled
      reviewed_at: '2026-11-18T14:00:00.000Z',
      fulfilled_at: '2026-11-19T11:00:00.000Z',
      sla_due_at: '2026-11-21T18:00:00.000Z',
      sla_breached: 0,
      status: STATUS.ACTIVE,
      createdAt: '2026-11-18T09:00:00.000Z',
      updatedAt: '2026-11-19T11:00:00.000Z',
    });
  }

  // 6. Offboarding Case
  let offCase = await offboarding_cases.findOne({ where: { case_no: 'OFF-FIX-001' } });
  if (!offCase) {
    offCase = await offboarding_cases.create({
      case_no: 'OFF-FIX-001',
      employee_id: emp2Id,
      exit_type: 1, // resignation
      resignation_date: '2026-11-01',
      last_working_date: '2026-11-30',
      reason: 'Relocating to another city',
      initiated_by: 1,
      case_status: 'open',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const offTask = await offboarding_tasks.findOne({
    where: { case_id: Number(offCase.get('id')) },
  });
  if (!offTask) {
    await offboarding_tasks.create({
      case_id: Number(offCase.get('id')),
      task_type: 'asset_return',
      priority: 'high',
      title: 'Return company issued laptop',
      due_date: '2026-11-30',
      task_status: 'pending',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 7. Deterministic Credential (Safe metadata, never exposes secrets)
  let credType = await credential_types.findOne({ where: { name: 'Fixture API Key' } });
  if (!credType) {
    credType = await credential_types.create({
      name: 'Fixture API Key',
      category: 'API & Tokens',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  let cred = await credentials.findOne({ where: { label: 'Fixture Production API Token' } });
  if (!cred) {
    cred = await credentials.create({
      employee_id: emp1Id,
      credential_type_id: Number(credType.get('id')),
      label: 'Fixture Production API Token',
      username: 'service_fixture_svc',
      url: 'https://api.fixture.local/v1',
      password_enc: 'DETERMINISTIC_ENCRYPTED_MOCK_BLOB_FOR_TEST',
      iv: 'DETERMINISTIC_IV_MOCK_16_BYTES_HEX',
      auth_tag: 'DETERMINISTIC_TAG_HEX_16B',
      approval_status: 2, // Approved
      submitted_at: '2026-11-15T08:30:00.000Z',
      last_revealed_at: '2026-11-19T14:15:00.000Z',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  let accessLog = await credential_access_logs.findOne({
    where: { credential_id: Number(cred.get('id')), action: 'REVEAL' },
  });
  const prevHash = GENESIS_HASH;
  if (!accessLog) {
    accessLog = await credential_access_logs.create({
      credential_id: Number(cred.get('id')),
      employee_id: emp1Id,
      accessed_by: 1,
      action: 'REVEAL',
      reason: null,
      ip_address: null,
      user_agent: null,
      success: 1,
      failure_reason: null,
      accessed_at: '2026-11-19T14:15:00.000Z',
      prev_hash: prevHash,
      hash: 'PENDING',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const logId = Number(accessLog.get('id'));
  const accessRowData = {
    id: logId,
    credential_id: Number(cred.get('id')),
    employee_id: emp1Id,
    accessed_by: 1,
    action: 'REVEAL',
    reason: null,
    ip_address: null,
    user_agent: null,
    success: 1,
    failure_reason: null,
    accessed_at: '2026-11-19T14:15:00.000Z',
  };
  const accessHash = computeRowHash(prevHash, accessRowData);
  await accessLog.update({ prev_hash: prevHash, hash: accessHash });

  // 8. Deterministic Activity Log
  const fixAuditDesc = 'DETERMINISTIC_FIXTURE_AUDIT_LOG_INITIALIZATION';
  let actLog = await activity_logs.findOne({ where: { description: fixAuditDesc } });
  const pHash = GENESIS_HASH;
  if (!actLog) {
    actLog = await activity_logs.create({
      module: 'reports',
      module_id: 1,
      action: 'EXPORT',
      description: fixAuditDesc,
      created_by_name: 'Test Administrator',
      prev_hash: pHash,
      hash: 'PENDING',
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }
  const actId = Number(actLog.get('id'));
  const actRowData = {
    id: actId,
    module: 'reports',
    module_id: 1,
    action: 'EXPORT',
    description: fixAuditDesc,
  };
  const cHash = computeRowHash(pHash, actRowData);
  await actLog.update({ prev_hash: pHash, hash: cHash });

  console.log('Deterministic test fixture successfully created.');
  process.exit(0);
}

seedTestFixture().catch((err) => {
  console.error('Test fixture seeding failed:', err);
  process.exit(1);
});
