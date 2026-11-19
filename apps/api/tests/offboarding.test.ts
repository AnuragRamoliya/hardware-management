/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  EMPLOYMENT_STATUS,
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_STATUS,
  OFFBOARDING_EXIT_TYPE,
  CASE_TRANSITIONS,
  TASK_TRANSITIONS,
  REQUEST_TYPE,
} from '@hm/shared';
import { OffboardingService } from '../Services/offboarding.service';
import { OffboardingTasksService } from '../Services/offboarding_tasks.service';
import { ClearancePdfService } from '../Services/clearance_pdf.service';
import {
  runOffboardingReminders,
  runLwdProcessing,
  runOverdueCheck,
  runPendingClearanceCheck,
} from '../Jobs/offboarding_daily';
import {
  sequelize,
  offboarding_cases,
  offboarding_tasks,
  employees,
  users,
  assets,
  asset_assignments,
  software,
  software_assignments,
  software_licenses,
  credentials,
  credential_types,
  requests,
  app_settings,
  activity_logs,
  notifications,
} from '../Database/Schema';
import { AssetAssignmentService } from '../Services/asset_assignment';
import { SoftwareService } from '../Services/software';
import { PortalRequestService } from '../Services/portal_request';
import type { UserInfo } from '../Types/api';

const dbTest = process.env.PHASE5_DB_INTEGRATION === '1' ? it : it.skip;

describe('Phase 5: Offboarding & Hardware Handover Tests', () => {
  const service = new OffboardingService();
  const tasksService = new OffboardingTasksService();
  const pdfService = new ClearancePdfService();
  const assetAssignmentService = new AssetAssignmentService();
  const softwareService = new SoftwareService();
  const portalRequestService = new PortalRequestService();

  const adminActor: UserInfo = {
    id: 1,
    role_id: 1,
    first_name: 'Super',
    last_name: 'Admin',
    email: 'admin@hardware.app',
  };

  const hrActor: UserInfo = {
    id: 2,
    role_id: 3,
    first_name: 'Helen',
    last_name: 'HR',
    email: 'hr@hardware.app',
  };

  const hwManagerActor: UserInfo = {
    id: 1, // Use existing admin/manager user ID to satisfy FK constraints
    role_id: 2,
    first_name: 'Hank',
    last_name: 'Hardware',
    email: 'hw@hardware.app',
  };

  describe('1. State Machine & Transition Rules', () => {
    it('validates allowed case transitions', () => {
      expect(CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.OPEN]).toContain(
        OFFBOARDING_CASE_STATUS.IN_PROGRESS,
      );
      expect(CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.OPEN]).toContain(
        OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
      );
      expect(CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.OPEN]).toContain(
        OFFBOARDING_CASE_STATUS.CANCELLED,
      );
      expect(CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.COMPLETED]).toHaveLength(0);
      expect(CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.CANCELLED]).toHaveLength(0);
    });

    it('validates allowed task transitions', () => {
      expect(TASK_TRANSITIONS[OFFBOARDING_TASK_STATUS.PENDING]).toContain(
        OFFBOARDING_TASK_STATUS.COMPLETED,
      );
      expect(TASK_TRANSITIONS[OFFBOARDING_TASK_STATUS.PENDING]).toContain(
        OFFBOARDING_TASK_STATUS.WAIVED,
      );
      expect(TASK_TRANSITIONS[OFFBOARDING_TASK_STATUS.PENDING]).toContain(
        OFFBOARDING_TASK_STATUS.EXCEPTION,
      );
      expect(TASK_TRANSITIONS[OFFBOARDING_TASK_STATUS.COMPLETED]).toHaveLength(0);
      expect(TASK_TRANSITIONS[OFFBOARDING_TASK_STATUS.WAIVED]).toHaveLength(0);
    });
  });

  describe('2. PDF Generation & Signatures', () => {
    it('generates a valid clearance certificate PDF with all key sections', async () => {
      const mockCase = {
        case_no: `TEST-PDF-${Date.now()}`,
        employee_id: 9999,
        resignation_date: '2026-11-01',
        last_working_date: '2026-11-15',
        clearance_number: 'CLR-TEST-0001',
        clearance_issued_at: new Date(),
        employee: {
          first_name: 'Test',
          last_name: 'User',
          employee_code: 'EMP-9999',
          department: { name: 'Engineering' },
          designation: { name: 'Senior Developer' },
        },
        tasks: [
          {
            task_type: OFFBOARDING_TASK_TYPE.ASSET,
            ref_label: 'AST-1001 · MacBook Pro',
            task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
            return_condition: 'good',
            outcome_notes: 'Returned with power brick',
          },
          {
            task_type: OFFBOARDING_TASK_TYPE.SOFTWARE,
            ref_label: 'JetBrains All Products Pack',
            task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
          },
          {
            task_type: OFFBOARDING_TASK_TYPE.CREDENTIAL,
            ref_label: 'AWS Production Account',
            task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
          },
        ],
      };

      const result = await pdfService.generateClearancePdf(mockCase, {
        company_name: 'Acme Test Corp',
        company_address: '100 Silicon Way',
        clearance_signatory_hr: 'Head of People',
        clearance_signatory_it: 'VP of Infrastructure',
      });

      expect(result.filePath).toBeDefined();
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(result.hash).toBeDefined();

      const stats = fs.statSync(result.filePath);
      expect(stats.size).toBeGreaterThan(1000);
    });

    it('generates a valid hardware handover receipt PDF', async () => {
      const mockCase = {
        case_no: `TEST-RECEIPT-${Date.now()}`,
        employee: {
          first_name: 'Alex',
          last_name: 'Smith',
          employee_code: 'EMP-8888',
        },
      };

      const receivedAssets = [
        {
          title: 'Dell Precision 5570',
          return_condition: 'fair',
          to_status: 'available',
          outcome_notes: 'Minor scuff on lid',
        },
      ];

      const result = await pdfService.generateHandoverReceiptPdf(
        mockCase,
        receivedAssets,
        hwManagerActor,
        {
          company_name: 'Acme Test Corp',
          company_address: '100 Silicon Way',
        },
      );

      expect(result.filePath).toBeDefined();
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(result.hash).toBeDefined();
    });
  });

  describe('3. Database & Workflow End-to-End Tests', () => {
    let testEmpId: number;
    let testAssetId: number;
    let testAssignmentId: number;
    let testSoftwareId: number;
    let testSwAssignmentId: number;
    let testCredentialId: number;
    let testRequestId: number;
    let activeCaseId: number;

    dbTest('sets up test employee with hardware, software, credential and request', async () => {
      // 1. Create fresh employee
      const [empRes] = await sequelize.query(`
        INSERT INTO employees (employee_code, first_name, last_name, email, employment_status, status, createdAt, updatedAt)
        VALUES ('TEST-EMP-${Date.now()}', 'Sarah', 'Connor', 'sarah.connor.${Date.now()}@example.com', 1, 1, NOW(), NOW())
      `);
      testEmpId = empRes as any;

      // 2. Assign available asset
      const [availAssets] = await sequelize.query(
        'SELECT a.id FROM assets a WHERE a.asset_status = 1 AND a.status = 1 AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.returned_at IS NULL) LIMIT 1',
      );
      if (availAssets.length > 0) {
        testAssetId = (availAssets[0] as any).id;
        const assignRes = await assetAssignmentService.assign(
          { asset_id: testAssetId, employee_id: testEmpId, due_return_date: '2026-12-01' },
          adminActor,
        );
        testAssignmentId = Number((assignRes as any).id);
      }

      // 3. Assign software: create test software with available license
      const [swRes] = await sequelize.query(`
        INSERT INTO software (name, vendor_id, category, license_type, status, createdAt, updatedAt)
        VALUES ('Test Suite Software', 1, 'productivity', 'per_user', 1, NOW(), NOW())
      `);
      testSoftwareId = swRes as any;

      const [licRes] = await sequelize.query(`
        INSERT INTO software_licenses (software_id, license_key, seats_total, status, createdAt, updatedAt)
        VALUES (${testSoftwareId}, 'LIC-TEST-KEY-100', 10, 1, NOW(), NOW())
      `);
      const testLicId = licRes as any;

      const [swAssignRes] = await sequelize.query(`
        INSERT INTO software_assignments (software_id, license_id, employee_id, assigned_at, assigned_by, status, createdAt, updatedAt)
        VALUES (${testSoftwareId}, ${testLicId}, ${testEmpId}, NOW(), 1, 1, NOW(), NOW())
      `);
      testSwAssignmentId = swAssignRes as any;

      // 4. Create credential
      const [credTypes] = await sequelize.query(
        'SELECT id FROM credential_types WHERE status = 1 LIMIT 1',
      );
      const credTypeId = credTypes.length > 0 ? (credTypes[0] as any).id : 1;
      const [credRes] = await sequelize.query(`
        INSERT INTO credentials (employee_id, credential_type_id, label, username, password_enc, iv, auth_tag, status, createdAt, updatedAt)
        VALUES (${testEmpId}, ${credTypeId}, 'Cloud Portal', 'sarah.c', 'enc-dummy', 'iv-dummy', 'tag-dummy', 1, NOW(), NOW())
      `);
      testCredentialId = credRes as any;

      // 5. Create open request
      const [reqRes] = await sequelize.query(`
        INSERT INTO requests (request_no, employee_id, request_type, title, reason, priority, request_status, status, createdAt, updatedAt)
        VALUES ('TEST-REQ-${Date.now()}', ${testEmpId}, ${REQUEST_TYPE.NEW_HARDWARE}, 'Ergonomic Keyboard', 'Need for workstation', 2, 1, 1, NOW(), NOW())
      `);
      testRequestId = reqRes as any;

      expect(testEmpId).toBeGreaterThan(0);
    });

    dbTest('preview dry run matches expected items and proposed handover owner', async () => {
      const preview = await service.preview(testEmpId);

      expect(preview.employee.id).toBe(testEmpId);
      expect(preview.counts.assets).toBeGreaterThanOrEqual(1);
      expect(preview.counts.software).toBeGreaterThanOrEqual(1);
      expect(preview.counts.credentials).toBeGreaterThanOrEqual(1);
      expect(preview.counts.open_requests).toBeGreaterThanOrEqual(1);
      expect(preview.counts.checklist_templates).toBeGreaterThanOrEqual(1);
      expect(preview.proposed_handover_to).toBeDefined();
    });

    dbTest('initiates offboarding end to end', async () => {
      const initiated = await service.initiate(
        {
          employee_id: testEmpId,
          exit_type: OFFBOARDING_EXIT_TYPE.RESIGNATION,
          resignation_date: '2026-11-01',
          last_working_date: '2026-11-20',
          reason: 'Accepted new opportunity elsewhere',
        },
        adminActor,
      );

      activeCaseId = Number(initiated.id);
      expect(activeCaseId).toBeGreaterThan(0);
      expect(initiated.case_no).toMatch(/^OFF-\d{6}$/);

      // Verify employee moved to NOTICE (2)
      const emp = await employees.findByPk(testEmpId);
      expect(Number(emp?.get('employment_status'))).toBe(EMPLOYMENT_STATUS.NOTICE);

      // Verify tasks created
      const tasks = await offboarding_tasks.findAll({ where: { case_id: activeCaseId } });
      const assetTasks = tasks.filter(
        (t) => Number(t.get('task_type')) === OFFBOARDING_TASK_TYPE.ASSET,
      );
      const swTasks = tasks.filter(
        (t) => Number(t.get('task_type')) === OFFBOARDING_TASK_TYPE.SOFTWARE,
      );
      const credTasks = tasks.filter(
        (t) => Number(t.get('task_type')) === OFFBOARDING_TASK_TYPE.CREDENTIAL,
      );
      const reqTasks = tasks.filter(
        (t) => Number(t.get('task_type')) === OFFBOARDING_TASK_TYPE.REQUEST,
      );

      expect(assetTasks.length).toBeGreaterThanOrEqual(1);
      expect(swTasks.length).toBeGreaterThanOrEqual(1);
      expect(credTasks.length).toBeGreaterThanOrEqual(1);
      expect(reqTasks.length).toBeGreaterThanOrEqual(1);

      // Verify asset set to pending_return (3)
      if (testAssetId) {
        const ast = await assets.findByPk(testAssetId);
        expect(Number(ast?.get('asset_status'))).toBe(3);
      }

      // Verify open request auto-cancelled
      if (testRequestId) {
        const req = await requests.findByPk(testRequestId);
        expect(Number(req?.get('request_status'))).toBe(8); // CANCELLED
      }
    });

    dbTest('double initiate returns 409 conflict', async () => {
      await expect(
        service.initiate(
          {
            employee_id: testEmpId,
            exit_type: OFFBOARDING_EXIT_TYPE.RESIGNATION,
            resignation_date: '2026-11-01',
            last_working_date: '2026-11-20',
            reason: 'Second attempt',
          },
          adminActor,
        ),
      ).rejects.toThrow(/already has an active offboarding case/);
    });

    dbTest(
      'blocks new asset and software assignments during notice period without approval override',
      async () => {
        // Find another available asset
        const [availAssets] = await sequelize.query(
          'SELECT a.id FROM assets a WHERE a.asset_status = 1 AND a.status = 1 AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.returned_at IS NULL) LIMIT 1',
        );

        if (availAssets.length > 0) {
          const nextAssetId = (availAssets[0] as any).id;
          await expect(
            assetAssignmentService.assign(
              { asset_id: nextAssetId, employee_id: testEmpId },
              hwManagerActor, // regular hardware manager without override reason
            ),
          ).rejects.toThrow(/blocked during notice period/);
        }
      },
    );

    dbTest(
      'allows asset assignment during notice with override reason and logs activity',
      async () => {
        const [availAssets] = await sequelize.query(
          'SELECT a.id FROM assets a WHERE a.asset_status = 1 AND a.status = 1 AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.returned_at IS NULL) LIMIT 1',
        );

        if (availAssets.length > 0) {
          const nextAssetId = (availAssets[0] as any).id;
          const assigned = await assetAssignmentService.assign(
            {
              asset_id: nextAssetId,
              employee_id: testEmpId,
              override_reason: 'Temporary handover replacement approved by VP',
            },
            adminActor,
          );
          expect(assigned).toBeDefined();

          // Check override activity log
          const logs = await activity_logs.findAll({
            where: { action: 'notice_assignment_override' },
          });
          expect(logs.length).toBeGreaterThanOrEqual(1);
        }
      },
    );

    dbTest('restricts portal requests to repair and return during notice', async () => {
      // Create user for test employee
      const [uRes] = await sequelize.query(`
        INSERT INTO users (role_id, first_name, last_name, email, password, status, createdAt, updatedAt)
        VALUES (4, 'Sarah', 'Connor', 'sarah.portal.${Date.now()}@example.com', 'hashed_pass_123', 1, NOW(), NOW())
      `);
      const userId = uRes as any;
      await employees.update({ user_id: userId }, { where: { id: testEmpId } });

      const portalUserActor: UserInfo = {
        id: userId,
        role_id: 4,
        first_name: 'Sarah',
        last_name: 'Connor',
        email: 'sarah.portal@example.com',
      };

      // Attempt new hardware request -> should reject
      await expect(
        portalRequestService.add(
          {
            request_type: REQUEST_TYPE.NEW_HARDWARE,
            category_id: 1,
            title: 'Need new screen',
            reason: 'Testing notice restriction',
          },
          portalUserActor,
        ),
      ).rejects.toThrow(/restricted to submitting hardware repair and return requests only/);
    });

    dbTest('receives hardware asset task and updates assignment/asset status', async () => {
      const assetTask = await offboarding_tasks.findOne({
        where: { case_id: activeCaseId, task_type: OFFBOARDING_TASK_TYPE.ASSET },
      });

      if (assetTask) {
        const taskId = Number(assetTask.get('id'));
        const received = await tasksService.receive(
          {
            task_id: taskId,
            return_condition: 'good',
            to_status: 'available',
            notes: 'Returned in working condition',
          },
          hwManagerActor,
        );

        expect(Number(received.task_status)).toBe(OFFBOARDING_TASK_STATUS.COMPLETED);

        // Verify asset is back to available (1)
        if (testAssetId) {
          const ast = await assets.findByPk(testAssetId);
          expect(Number(ast?.get('asset_status'))).toBe(1);
        }

        // Verify case moved to IN_PROGRESS (2)
        const c = await offboarding_cases.findByPk(activeCaseId);
        expect(Number(c?.get('case_status'))).toBe(OFFBOARDING_CASE_STATUS.IN_PROGRESS);
      }
    });

    dbTest('concurrent receive on already completed task returns clear error', async () => {
      const completedTask = await offboarding_tasks.findOne({
        where: {
          case_id: activeCaseId,
          task_type: OFFBOARDING_TASK_TYPE.ASSET,
          task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
        },
      });

      if (completedTask) {
        await expect(
          tasksService.receive({ task_id: Number(completedTask.get('id')) }, hwManagerActor),
        ).rejects.toThrow(/already completed/);
      }
    });

    dbTest('waives checklist task requiring reason and permission', async () => {
      const checklistTask = await offboarding_tasks.findOne({
        where: {
          case_id: activeCaseId,
          task_type: OFFBOARDING_TASK_TYPE.CHECKLIST,
          task_status: OFFBOARDING_TASK_STATUS.PENDING,
        },
      });

      if (checklistTask) {
        // Without reason -> 422
        await expect(
          tasksService.waive({ task_id: Number(checklistTask.get('id')), reason: '' }, adminActor),
        ).rejects.toThrow(/minimum 5 characters/);

        // With valid reason
        const waived = await tasksService.waive(
          {
            task_id: Number(checklistTask.get('id')),
            reason: 'Waived due to remote overseas employee location',
          },
          adminActor,
        );
        expect(Number(waived.task_status)).toBe(OFFBOARDING_TASK_STATUS.WAIVED);
      }
    });

    dbTest('extends LWD and updates task and assignment due dates', async () => {
      const newLwd = '2026-11-28';
      await service.update(
        {
          id: activeCaseId,
          last_working_date: newLwd,
          reason: 'Pending project handover extension',
        },
        adminActor,
      );

      const c = await offboarding_cases.findByPk(activeCaseId);
      expect(String(c?.get('last_working_date'))).toBe(newLwd);

      const emp = await employees.findByPk(testEmpId);
      expect(String(emp?.get('last_working_date'))).toBe(newLwd);

      // Verify pending tasks due_date updated
      const pendingTasks = await offboarding_tasks.findAll({
        where: { case_id: activeCaseId, task_status: OFFBOARDING_TASK_STATUS.PENDING },
      });
      for (const t of pendingTasks) {
        expect(String(t.get('due_date'))).toBe(newLwd);
      }
    });

    dbTest(
      'executes LWD daily job: employee -> resigned, seats freed, credentials disabled',
      async () => {
        // Simulate today = LWD
        const lwdSim = new Date('2026-11-29T10:00:00Z');
        const res = await runLwdProcessing(lwdSim);

        expect(res.employeesResigned).toBeGreaterThanOrEqual(1);
        expect(res.softwareRevoked).toBeGreaterThanOrEqual(1);
        expect(res.credentialsDisabled).toBeGreaterThanOrEqual(1);

        // Verify employee is now RESIGNED (3)
        const emp = await employees.findByPk(testEmpId);
        expect(Number(emp?.get('employment_status'))).toBe(EMPLOYMENT_STATUS.RESIGNED);

        // Verify credential task is now completed
        const credTask = await offboarding_tasks.findOne({
          where: { case_id: activeCaseId, task_type: OFFBOARDING_TASK_TYPE.CREDENTIAL },
        });
        expect(Number(credTask?.get('task_status'))).toBe(OFFBOARDING_TASK_STATUS.COMPLETED);

        // Verify re-run is idempotent
        const rerun = await runLwdProcessing(lwdSim);
        expect(rerun.employeesResigned).toBe(0);
      },
    );

    dbTest('blocks clearance completion when mandatory tasks are unresolved', async () => {
      // Ensure at least one mandatory checklist task is pending
      const pendingTask = await offboarding_tasks.findOne({
        where: { case_id: activeCaseId, task_status: OFFBOARDING_TASK_STATUS.PENDING },
      });

      if (pendingTask) {
        await expect(service.complete({ id: activeCaseId }, adminActor)).rejects.toThrow(
          /unresolved/,
        );
      }
    });

    dbTest('completes remaining tasks and issues final clearance certificate', async () => {
      // Complete all remaining pending tasks
      const remainingTasks = await offboarding_tasks.findAll({
        where: { case_id: activeCaseId, task_status: OFFBOARDING_TASK_STATUS.PENDING },
      });

      for (const t of remainingTasks) {
        await tasksService.complete(
          { task_id: Number(t.get('id')), notes: 'Cleared for exit' },
          adminActor,
        );
      }

      // Reset LWD to today so clearance issuance passes validation (cannot issue before LWD)
      await offboarding_cases.update(
        { last_working_date: '2026-11-19' },
        { where: { id: activeCaseId } },
      );

      // Issue clearance
      const completedCase = await service.complete(
        { id: activeCaseId, clearance_notes: 'All items settled cleanly' },
        adminActor,
      );

      expect(Number(completedCase.case_status)).toBe(OFFBOARDING_CASE_STATUS.COMPLETED);
      expect(completedCase.clearance_number).toMatch(/^CLR-OFF-\d{6}$/);
      expect(completedCase.clearance_file_path).toBeDefined();

      // Verify employee moved to EXITED (4)
      const emp = await employees.findByPk(testEmpId);
      expect(Number(emp?.get('employment_status'))).toBe(EMPLOYMENT_STATUS.EXITED);
    });

    dbTest('verifies exited employee user cannot log in', async () => {
      const emp = await employees.findByPk(testEmpId);
      const userId = Number(emp?.get('user_id'));

      if (userId) {
        const u = await users.findByPk(userId);
        expect(Number(u?.get('status'))).toBe(0); // Deactivated
      }
    });

    dbTest(
      'withdrawal before LWD restores employee to active and pending_return assets to assigned',
      async () => {
        // Create employee 2 and initiate
        const [empRes] = await sequelize.query(`
        INSERT INTO employees (employee_code, first_name, last_name, email, employment_status, status, createdAt, updatedAt)
        VALUES ('WITHDRAW-EMP-${Date.now()}', 'John', 'Connor', 'john.${Date.now()}@example.com', 1, 1, NOW(), NOW())
      `);
        const emp2Id = empRes as any;

        // Assign an asset
        const [availAssets] = await sequelize.query(
          'SELECT a.id FROM assets a WHERE a.asset_status = 1 AND a.status = 1 AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.returned_at IS NULL) LIMIT 1',
        );
        let a2Id: number | null = null;
        if (availAssets.length > 0) {
          a2Id = (availAssets[0] as any).id;
          await assetAssignmentService.assign({ asset_id: a2Id!, employee_id: emp2Id }, adminActor);
        }

        const case2 = await service.initiate(
          {
            employee_id: emp2Id,
            exit_type: OFFBOARDING_EXIT_TYPE.RESIGNATION,
            resignation_date: '2026-11-01',
            last_working_date: '2026-12-01',
            reason: 'Initial resignation',
          },
          adminActor,
        );

        const case2Id = Number(case2.id);

        // Withdraw
        await service.cancel(
          { id: case2Id, reason: 'Employee accepted counter-offer and withdrew resignation' },
          adminActor,
        );

        // Check employee is back to ACTIVE (1)
        const restoredEmp = await employees.findByPk(emp2Id);
        expect(Number(restoredEmp?.get('employment_status'))).toBe(EMPLOYMENT_STATUS.ACTIVE);

        // Check asset is back to ASSIGNED (2)
        if (a2Id) {
          const restoredAsset = await assets.findByPk(a2Id);
          expect(Number(restoredAsset?.get('asset_status'))).toBe(2);
        }

        // Check case is CANCELLED (5)
        const cancelledCase = await offboarding_cases.findByPk(case2Id);
        expect(Number(cancelledCase?.get('case_status'))).toBe(OFFBOARDING_CASE_STATUS.CANCELLED);
      },
    );
  });
});
