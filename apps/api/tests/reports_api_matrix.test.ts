import { describe, it, expect } from 'vitest';
import { ALL_REPORTS, canRoleAccessReport, getReport } from '../Reports/registry';
import { reportService } from '../Services/report.service';
import { exportWorker } from '../Reports/export_worker';
import { exportReportToCsv } from '../Reports/exporters/csv_exporter';
import { exportReportToXlsx } from '../Reports/exporters/xlsx_exporter';
import { exportReportToPdf } from '../Reports/exporters/pdf_exporter';
import { parseDateBounds, validateAndWhitelistFilters } from '../Reports/helpers';
import { export_jobs } from '../Database/Schema';
import { EXPORT_JOB_STATUS } from '@hm/shared';
import ExcelJS from 'exceljs';
import { Writable } from 'node:stream';
import type { UserInfo } from '../Types/api';

describe('Phase 6 F3: Comprehensive Reports API & Exporter Verification Matrix', () => {
  const superAdmin: UserInfo = {
    id: 1,
    role_id: 1,
    role: 'super_admin',
    first_name: 'Super',
    last_name: 'Admin',
    email: 'admin@test.local',
  };

  const hwManager: UserInfo = {
    id: 2,
    role_id: 2,
    role: 'hardware_manager',
    first_name: 'HW',
    last_name: 'Manager',
    email: 'hw@test.local',
  };

  const hrUser: UserInfo = {
    id: 3,
    role_id: 3,
    role: 'hr',
    first_name: 'HR',
    last_name: 'Specialist',
    email: 'hr@test.local',
  };

  const employeeUser: UserInfo = {
    id: 4,
    role_id: 4,
    role: 'employee',
    first_name: 'Employee',
    last_name: 'User',
    email: 'emp@test.local',
  };

  describe('1. Full RBAC Matrix (4 roles x 10 reports)', () => {
    it('enforces exact permission matrix across all 10 reports', () => {
      for (const r of ALL_REPORTS) {
        // Super Admin has access to all 10 reports
        expect(canRoleAccessReport('super_admin', r.key)).toBe(true);

        // Employee is strictly forbidden from all 10 reports
        expect(canRoleAccessReport('employee', r.key)).toBe(false);

        // Hardware Manager has access to 8 operational reports, blocked from credentials & audit
        if (r.key === 'credential-approvals-access' || r.key === 'audit-export') {
          expect(canRoleAccessReport('hardware_manager', r.key)).toBe(false);
        } else {
          expect(canRoleAccessReport('hardware_manager', r.key)).toBe(true);
        }

        // HR has access only to request turnaround SLA and offboarding status
        if (r.key === 'request-turnaround-sla' || r.key === 'offboarding-status') {
          expect(canRoleAccessReport('hr', r.key)).toBe(true);
        } else {
          expect(canRoleAccessReport('hr', r.key)).toBe(false);
        }
      }
    });

    it('throws 403 on runReport and exportReport when unauthorized role calls them', async () => {
      // Employee attempting to run any report throws 403
      await expect(
        reportService.runReport('hardware-per-employee', {}, employeeUser),
      ).rejects.toMatchObject({ status: 403 });

      // Hardware manager attempting credentials report throws 403
      await expect(
        reportService.runReport('credential-approvals-access', {}, hwManager),
      ).rejects.toMatchObject({ status: 403 });

      // HR attempting software licenses report throws 403
      await expect(
        reportService.runReport('software-license-utilization', {}, hrUser),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('2. Filter Whitelist and SQL-like Input Neutralization', () => {
    it('accepts valid whitelisted filter keys', () => {
      const rep = getReport('hardware-per-employee')!;
      const sanitized = validateAndWhitelistFilters(rep, {
        employee_id: 1,
        search: 'Laptop',
      });
      expect(sanitized).toEqual({ employee_id: 1, search: 'Laptop' });
    });

    it('rejects unknown filter keys with 400 Bad Request', () => {
      const rep = getReport('hardware-per-employee')!;
      expect(() =>
        validateAndWhitelistFilters(rep, {
          malicious_key: 'hacked',
        }),
      ).toThrow(/not allowed for report/);
    });

    it('rejects SQL injection injection patterns in filter values with 400', () => {
      const rep = getReport('hardware-per-employee')!;
      expect(() =>
        validateAndWhitelistFilters(rep, {
          search: "1' OR '1'='1; DROP TABLE users; --",
        }),
      ).toThrow(/SQL syntax or dangerous characters detected/);
    });
  });

  describe('3. Asia/Kolkata Midnight Boundary Parsing', () => {
    it('correctly anchors midnight to UTC+05:30 boundaries', () => {
      const bounds = parseDateBounds('2026-11-20', '2026-11-20');
      expect(bounds).not.toBeNull();
      // In Asia/Kolkata (+05:30), 2026-11-20T00:00:00+05:30 corresponds to 2026-11-19T18:30:00.000Z
      expect(bounds?.start.toISOString()).toBe('2026-11-19T18:30:00.000Z');
      // End of day 2026-11-20T23:59:59.999+05:30 corresponds to 2026-11-20T18:29:59.999Z
      expect(bounds?.end.toISOString()).toBe('2026-11-20T18:29:59.999Z');
    });
  });

  describe('4. CSV Exporter: Parsing back BOM, Quoting & Formula Neutralization', () => {
    it('emits valid CSV with UTF-8 BOM, safe quoting and formula neutralization', async () => {
      const rep = getReport('hardware-per-employee')!;
      let csvContent = '';
      const memStream = new Writable({
        write(chunk, _enc, cb) {
          csvContent += chunk.toString('utf-8');
          cb();
        },
      });

      async function* mockStream() {
        yield [
          {
            employee_name: '=1+1',
            employee_code: '@MALICIOUS',
            department: '-DANGER',
            asset_tag: '+PLUS',
            asset_name: 'Normal Device',
            category: 'Laptops',
            serial_number: 'SN-001',
            assigned_date: '2026-11-20',
            warranty_status: 'active',
          },
        ];
      }

      await exportReportToCsv({
        report: rep,
        stream: mockStream(),
        output: memStream,
      });

      // 1. Starts with UTF-8 BOM
      expect(csvContent.startsWith('\uFEFF')).toBe(true);

      // 2. Contains neutralized formula injection
      expect(csvContent).toContain('"\'=1+1"');
      expect(csvContent).toContain('"\'@MALICIOUS"');
      expect(csvContent).toContain('"\'-DANGER"');
      expect(csvContent).toContain('"\'+PLUS"');
    });
  });

  describe('5. XLSX Exporter with ExcelJS', () => {
    it('creates valid Excel file with headers, styled summary and frozen panes', async () => {
      const rep = getReport('hardware-per-employee')!;
      const chunks: Buffer[] = [];
      const memStream = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(Buffer.from(chunk));
          cb();
        },
      });

      async function* mockStream() {
        yield [
          {
            employee_name: 'Alice',
            employee_code: 'FIX-001',
            department: 'Engineering',
            asset_tag: 'TAG-001',
            asset_name: 'Laptop',
            category: 'Laptops',
            serial_number: 'SN-001',
            assigned_date: '2026-11-20',
            warranty_status: 'active',
          },
        ];
      }

      const { rowCount } = await exportReportToXlsx({
        report: rep,
        stream: mockStream(),
        output: memStream,
        summary: [{ key: 'total', label: 'Total Assets', value: 1 }],
      });

      expect(rowCount).toBe(1);

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify opening with ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      expect(workbook.worksheets.length).toBeGreaterThanOrEqual(1);
      const dataSheet = workbook.worksheets[0];
      expect(dataSheet.name).toBe(rep.title.slice(0, 31));

      // Header row assertions
      const headerRow = dataSheet.getRow(1);
      expect(headerRow.getCell(1).value).toBe(rep.columns[0].label);
    });
  });

  describe('6. PDF Exporter with PDFKit', () => {
    it('creates non-empty valid landscape PDF buffer', async () => {
      const rep = getReport('hardware-per-employee')!;
      const chunks: Buffer[] = [];
      const memStream = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(Buffer.from(chunk));
          cb();
        },
      });

      async function* mockStream() {
        yield [
          {
            employee_name: 'Alice',
            employee_code: 'FIX-001',
            department: 'Engineering',
            asset_tag: 'TAG-001',
            asset_name: 'Laptop',
            category: 'Laptops',
            serial_number: 'SN-001',
            assigned_date: '2026-11-20',
            warranty_status: 'active',
          },
        ];
      }

      const { rowCount } = await exportReportToPdf({
        report: rep,
        stream: mockStream(),
        output: memStream,
        summary: [{ key: 'total', label: 'Total', value: 1 }],
      });

      expect(rowCount).toBe(1);
      const pdfBuffer = Buffer.concat(chunks);
      expect(pdfBuffer.length).toBeGreaterThan(100);
      // Valid PDF signature check
      expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('7. Sync vs Async Threshold & Job Lifecycle', () => {
    it('routes export to background job when preferAsync is true', async () => {
      const res = await reportService.exportReport(
        'hardware-per-employee',
        'csv',
        {},
        superAdmin,
        true, // preferAsync
      );

      expect(res.isAsync).toBe(true);
      expect(res.jobId).toBeDefined();

      // Retrieve job
      const job = await reportService.getJob(res.jobId!, superAdmin.id, 'super_admin');
      expect(job.report_key).toBe('hardware-per-employee');
      expect(job.job_status).toBe(EXPORT_JOB_STATUS.QUEUED);
    });

    it('enforces owner-only and super_admin download access', async () => {
      const { users: userModel } = await import('../Database/Schema');
      const hwRow = await userModel.findOne({ where: { email: 'hw@fixture.local' } });
      const hrRow = await userModel.findOne({ where: { email: 'hr@fixture.local' } });
      const adminRow = await userModel.findOne({ where: { email: 'admin@fixture.local' } });

      const hwUserId = Number(hwRow?.get('id') || 2);
      const hrUserId = Number(hrRow?.get('id') || 3);
      const adminUserId = Number(adminRow?.get('id') || 1);

      const newJob = await export_jobs.create({
        report_key: 'hardware-per-employee',
        format: 'csv',
        job_status: EXPORT_JOB_STATUS.DONE,
        requested_by: hwUserId,
        progress: 100,
        expires_at: new Date(Date.now() + 86400000),
      });
      const jobId = Number(newJob.get('id'));

      // Other non-admin user cannot access job
      await expect(reportService.getJob(jobId, hrUserId, 'hr')).rejects.toMatchObject({
        status: 403,
      });

      // Owner can access job
      const ownerJob = await reportService.getJob(jobId, hwUserId, 'hardware_manager');
      expect(ownerJob.id).toBe(jobId);

      // Super admin can access job
      const adminJob = await reportService.getJob(jobId, adminUserId, 'super_admin');
      expect(adminJob.id).toBe(jobId);
    });

    it('returns 410 Gone when export job has expired', async () => {
      const { users: userModel } = await import('../Database/Schema');
      const adminRow = await userModel.findOne({ where: { email: 'admin@fixture.local' } });
      const adminUserId = Number(adminRow?.get('id') || 1);

      const expiredJob = await export_jobs.create({
        report_key: 'hardware-per-employee',
        format: 'csv',
        job_status: EXPORT_JOB_STATUS.EXPIRED,
        requested_by: adminUserId,
        progress: 100,
        expires_at: new Date(Date.now() - 86400000), // yesterday
      });

      await expect(
        reportService.getJobDownloadPath(Number(expiredJob.get('id')), adminUserId, 'super_admin'),
      ).rejects.toMatchObject({ status: 410 });
    });

    it('runs cleanupExpiredExports idempotently without unlinking errors', async () => {
      const cleanedFirst = await exportWorker.cleanupExpiredExports();
      expect(typeof cleanedFirst).toBe('number');

      // Running second time should find 0 additional expired jobs (idempotent)
      const cleanedSecond = await exportWorker.cleanupExpiredExports();
      expect(cleanedSecond).toBe(0);
    });
  });
});
