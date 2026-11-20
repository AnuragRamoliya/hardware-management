import { describe, it, expect, beforeAll } from 'vitest';
import {
  users,
  employees,
  requests,
  credentials,
  offboarding_cases,
  export_jobs,
} from '../Database/Schema';
import { PortalRequestService } from '../Services/portal_request';
import { OffboardingService } from '../Services/offboarding.service';
import { CredentialVaultService } from '../Services/credential_vault';
import { reportService } from '../Services/report.service';
import { ROLES, EXPORT_JOB_STATUS } from '@hm/shared';

describe('A2: Authorization & IDOR Boundaries Verification', () => {
  let employeeUser1: any;
  let empRecord1: any;
  let empRecord2: any;
  let requestOfEmp1: any;
  let credOfEmp1: any;
  let offboardingCaseEmp1: any;
  let exportJobEmp1: any;

  const portalRequestService = new PortalRequestService();
  const offboardingService = new OffboardingService();
  const credentialVaultService = new CredentialVaultService();

  beforeAll(async () => {
    // 1. Fetch fixture users and employees
    employeeUser1 = await users.findOne({ where: { email: 'emp@fixture.local' } });
    empRecord1 = await employees.findOne({ where: { user_id: employeeUser1.id } });

    // Find another employee
    empRecord2 = await employees.findOne({
      where: { employee_code: 'EMP-IDOR-999' },
    });
    if (!empRecord2) {
      empRecord2 = await employees.create({
        employee_code: 'EMP-IDOR-999',
        first_name: 'Other',
        last_name: 'Employee',
        email: 'other.emp.idor@example.com',
        phone: '9876543299',
        department_id: 1,
        designation_id: 1,
        location_id: 1,
        hire_date: '2026-01-01',
        employment_status: 1,
        status: 1,
      });
    }

    // 2. Fetch or create a request owned by Emp 1
    requestOfEmp1 = await requests.findOne({ where: { employee_id: empRecord1.id } });
    if (!requestOfEmp1) {
      requestOfEmp1 = await requests.create({
        ticket_no: 'REQ-IDOR-TEST-001',
        employee_id: empRecord1.id,
        request_type: 1,
        title: 'Emp 1 Laptop Request',
        reason: 'IDOR Testing',
        request_status: 1, // Submitted
        status: 1,
        created_by: employeeUser1.id,
      });
    }

    // 3. Credential owned by Emp 1
    credOfEmp1 = await credentials.findOne({ where: { employee_id: empRecord1.id } });

    // 4. Offboarding case for Emp 1
    offboardingCaseEmp1 = await offboarding_cases.findOne({
      where: { employee_id: empRecord1.id },
    });

    // 5. Export job for Emp 1
    exportJobEmp1 = await export_jobs.findOne({
      where: { requested_by: employeeUser1.id },
    });
    if (!exportJobEmp1) {
      exportJobEmp1 = await export_jobs.create({
        report_key: 'hardware-per-employee',
        format: 'csv',
        file_name: 'test-export.csv',
        file_path: '/tmp/test-export.csv',
        requested_by: employeeUser1.id,
        user_role: 'employee',
        job_status: EXPORT_JOB_STATUS.DONE,
        row_count: 5,
        expires_at: new Date(Date.now() + 86400000),
        status: 1,
      });
    }
  });

  it('employee cannot access or cancel another employee request via portal', async () => {
    // Actor is Emp 2 (user id 9999 or non-emp1)
    const emp2Actor = {
      id: 999999,
      role_id: 4,
      role: ROLES.EMPLOYEE,
      first_name: 'Intruder',
      last_name: 'Employee',
      email: 'intruder@example.com',
    };

    // Attempting to cancel Emp 1's request with Emp 2's actor identity
    await expect(
      portalRequestService.cancel({ id: requestOfEmp1.id, reason: 'Malicious cancel' }, emp2Actor),
    ).rejects.toThrow();

    // Attempting to add comment to Emp 1's request with Emp 2's identity
    await expect(
      portalRequestService.addComment(
        { request_id: requestOfEmp1.id, comment: 'Malicious comment' },
        emp2Actor,
      ),
    ).rejects.toThrow();
  });

  it('employee cannot reveal another employee credential via portal', async () => {
    if (credOfEmp1) {
      const emp2Actor = {
        id: 999999,
        role_id: 4,
        role: ROLES.EMPLOYEE,
        first_name: 'Intruder',
        last_name: 'Employee',
        email: 'intruder@example.com',
        employee_id: 999999, // mismatched employee_id
      };

      // Mock verifyReauthToken or test rejection
      await expect(
        credentialVaultService.revealSecret(
          credOfEmp1.id,
          'mock_token',
          undefined,
          emp2Actor,
          true, // isPortal
        ),
      ).rejects.toThrow();
    }
  });

  it('employee cannot download another employee clearance certificate (IDOR check)', async () => {
    if (offboardingCaseEmp1) {
      const emp2Actor = {
        id: 999999,
        role_id: 4,
        role: ROLES.EMPLOYEE,
        first_name: 'Intruder',
        last_name: 'Employee',
        email: 'intruder@example.com',
      };

      await expect(
        offboardingService.getClearancePdf(offboardingCaseEmp1.id, emp2Actor),
      ).rejects.toThrow(/You are not authorized to download this clearance document/);
    }
  });

  it('employee cannot download another employee export job file (IDOR check)', async () => {
    const intruderUserId = 888888;
    await expect(
      reportService.getJobDownloadPath(exportJobEmp1.id, intruderUserId, 'employee'),
    ).rejects.toThrow(/Access forbidden/);
  });

  it('hardware manager cannot access security-restricted reports R9 or R10', async () => {
    const hwManagerActor = {
      id: 2,
      role_id: 2,
      role: ROLES.HARDWARE_MANAGER,
      first_name: 'HW',
      last_name: 'Manager',
      email: 'hw@fixture.local',
    };

    // R9: Credential Approvals & Access Audit
    await expect(
      reportService.runReport(
        'credential-approvals-access',
        {},
        hwManagerActor.id,
        hwManagerActor.role,
      ),
    ).rejects.toThrow();

    // R10: Audit Log Export
    await expect(
      reportService.runReport('audit-export', {}, hwManagerActor.id, hwManagerActor.role),
    ).rejects.toThrow();
  });
});
