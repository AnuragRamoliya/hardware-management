import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReport, ALL_REPORTS, canRoleAccessReport } from '../Reports/registry';
import { reportService } from '../Services/report.service';
import { exportReportToCsv } from '../Reports/exporters/csv_exporter';
import { Writable } from 'node:stream';

describe('Phase 6: Reports & Exports Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Registry & Role Permissions', () => {
    it('registers all 10 core enterprise reports', () => {
      expect(ALL_REPORTS).toHaveLength(10);
      const keys = ALL_REPORTS.map((r) => r.key);
      expect(keys).toContain('hardware-per-employee');
      expect(keys).toContain('assets-by-category-department');
      expect(keys).toContain('assigned-vs-unassigned');
      expect(keys).toContain('software-license-utilization');
      expect(keys).toContain('warranty-expiry');
      expect(keys).toContain('repair-history');
      expect(keys).toContain('request-turnaround-sla');
      expect(keys).toContain('offboarding-status');
      expect(keys).toContain('credential-approvals-access');
      expect(keys).toContain('audit-export');
    });

    it('enforces RBAC role accessibility matrix accurately', () => {
      // Super admin can access all 10
      for (const r of ALL_REPORTS) {
        expect(canRoleAccessReport('super_admin', r.key)).toBe(true);
      }

      // Employee cannot access any reports
      for (const r of ALL_REPORTS) {
        expect(canRoleAccessReport('employee', r.key)).toBe(false);
      }

      // Hardware manager can access operational reports (1-7), but blocked from credential secrets and audit ledger
      expect(canRoleAccessReport('hardware_manager', 'hardware-per-employee')).toBe(true);
      expect(canRoleAccessReport('hardware_manager', 'repair-history')).toBe(true);
      expect(canRoleAccessReport('hardware_manager', 'credential-approvals-access')).toBe(false);
      expect(canRoleAccessReport('hardware_manager', 'audit-export')).toBe(false);

      // HR can access offboarding and request turnaround SLA, but blocked from software/hardware
      expect(canRoleAccessReport('hr', 'offboarding-status')).toBe(true);
      expect(canRoleAccessReport('hr', 'request-turnaround-sla')).toBe(true);
      expect(canRoleAccessReport('hr', 'software-license-utilization')).toBe(false);
      expect(canRoleAccessReport('hr', 'credential-approvals-access')).toBe(false);
    });

    it('throws 403 when unauthorized role attempts to access report metadata or run report', async () => {
      expect(() =>
        reportService.getReportMeta('credential-approvals-access', 'hardware_manager'),
      ).toThrow(/Access forbidden/);

      await expect(
        reportService.runReport(
          'audit-export',
          {},
          {
            id: 99,
            role_id: 3,
            role: 'employee',
            first_name: 'Emp',
            last_name: 'X',
            email: 'emp@test.com',
          },
        ),
      ).rejects.toThrow(/Access forbidden/);
    });
  });

  describe('Exporters: CSV Formula Injection Prevention & UTF-8 BOM', () => {
    it('prepends UTF-8 BOM and neutralizes formula injection characters', async () => {
      const rep = getReport('hardware-per-employee')!;
      let outputString = '';

      const memStream = new Writable({
        write(chunk, _enc, cb) {
          outputString += chunk.toString('utf-8');
          cb();
        },
      });

      async function* mockDataStream() {
        yield [
          {
            id: 1,
            employee_name: '=CMD("calc.exe")',
            employee_code: '+123456',
            department: '-Sensitive',
            asset_tag: '@FormulaLeak',
            category: 'Laptops',
            brand: 'Dell',
            model: 'XPS 15',
            assigned_at: '2026-11-20',
          },
        ];
      }

      await exportReportToCsv({
        report: rep,
        stream: mockDataStream(),
        output: memStream,
      });

      // UTF-8 BOM check
      expect(outputString.startsWith('\uFEFF')).toBe(true);

      // Formula injection neutralization check (leading single quote prefix)
      expect(outputString).toContain("'=CMD(");
      expect(outputString).toContain("'+123456");
      expect(outputString).toContain("'-Sensitive");
      expect(outputString).toContain("'@FormulaLeak");
    });
  });

  describe('Security: Credential Approvals Zero-Secrets Leak Guarantee', () => {
    it('strictly forbids password, secret, iv, salt, auth_tag in report columns and schema', () => {
      const rep = getReport('credential-approvals-access')!;
      const colKeys = rep.columns.map((c) => c.key.toLowerCase());

      const forbiddenSubstrings = [
        'password',
        'secret',
        'hash',
        'iv',
        'auth_tag',
        'salt',
        'token_value',
        'key_data',
      ];
      for (const col of colKeys) {
        for (const forbidden of forbiddenSubstrings) {
          expect(col).not.toContain(forbidden);
        }
      }

      // Verify safe metadata columns are present
      expect(colKeys).toContain('label');
      expect(colKeys).toContain('credential_type');
      expect(colKeys).toContain('approval_status');
      expect(colKeys).toContain('reveal_count');
    });
  });
});
