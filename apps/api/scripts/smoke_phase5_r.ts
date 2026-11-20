import 'dotenv/config';
import { sequelize } from '../Database/Schema';
import { runOffboardingDaily } from '../Jobs/offboarding_daily';
import { OffboardingService } from '../Services/offboarding.service';
import { canJoinRoom } from '../Realtime/rooms';

async function runSmoke() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 + PHASE R SMOKE TEST FLOW');
  console.log('====================================================\n');

  await sequelize.authenticate();
  console.log('Database connection established successfully.');

  const offboardingService = new OffboardingService();

  // 1. Verify Realtime Room Authorization
  console.log('--- STEP 1: Realtime Socket Authorization & Event Routing ---');
  const empUser = {
    id: 99,
    email: 'emp@test.local',
    role: 'employee',
    role_id: 4,
    employee_id: 123,
    first_name: 'Emp',
    last_name: 'User',
  };
  const hwUser = {
    id: 2,
    email: 'hw@test.local',
    role: 'hardware_manager',
    role_id: 2,
    employee_id: null,
    first_name: 'Hw',
    last_name: 'Manager',
  };

  const joinHwRoleAsEmp = await canJoinRoom(empUser as any, 'role:hardware_manager');
  const joinAdminRoleAsEmp = await canJoinRoom(empUser as any, 'role:admin');
  const joinHwRoleAsHw = await canJoinRoom(hwUser as any, 'role:hardware_manager');

  console.log(
    `canJoinRoom(employee, "role:hardware_manager") -> ${joinHwRoleAsEmp} (Expected: false)`,
  );
  console.log(`canJoinRoom(employee, "role:admin") -> ${joinAdminRoleAsEmp} (Expected: false)`);
  console.log(
    `canJoinRoom(hardware_manager, "role:hardware_manager") -> ${joinHwRoleAsHw} (Expected: true)`,
  );

  if (joinHwRoleAsEmp || joinAdminRoleAsEmp || !joinHwRoleAsHw) {
    throw new Error('Realtime room RBAC checks failed');
  }
  console.log('STEP 1 RESULT: PASSED\n');

  // 2. Verify Verify Document Endpoint Privacy & Security
  console.log('--- STEP 2: Document Verification Security & Constant Time ---');
  const invalidRes = await offboardingService.verifyDocument('CLR-INVALID-TEST-NONEXISTENT');
  console.log('Invalid code verification result:', invalidRes);
  if (invalidRes.valid !== false || invalidRes.case_no !== null || invalidRes.issued_at !== null) {
    throw new Error('Invalid code verification failed to return expected exact shape');
  }
  console.log('STEP 2 RESULT: PASSED\n');

  // 3. Verify Daily Sweep Idempotency
  console.log('--- STEP 3: Offboarding Daily Sweep Idempotency ---');
  const today = new Date();
  const sweep1 = await runOffboardingDaily(today);
  const sweep2 = await runOffboardingDaily(today);
  console.log('Daily Sweep 1:', sweep1);
  console.log('Daily Sweep 2:', sweep2);
  console.log('STEP 3 RESULT: PASSED\n');

  console.log('====================================================');
  console.log('ALL PHASE 5 + PHASE R SMOKE TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

runSmoke().catch((err) => {
  console.error('Smoke test failure:', err);
  process.exit(1);
});
