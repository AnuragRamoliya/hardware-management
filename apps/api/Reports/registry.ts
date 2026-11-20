import type { ReportDefinition } from './types';
import { hardwarePerEmployeeReport } from './definitions/hardware-per-employee';
import { assetsByCategoryDepartmentReport } from './definitions/assets-by-category-department';
import { assignedVsUnassignedReport } from './definitions/assigned-vs-unassigned';
import { softwareLicenseUtilizationReport } from './definitions/software-license-utilization';
import { warrantyExpiryReport } from './definitions/warranty-expiry';
import { repairHistoryReport } from './definitions/repair-history';
import { requestTurnaroundSlaReport } from './definitions/request-turnaround-sla';
import { offboardingStatusReport } from './definitions/offboarding-status';
import { credentialApprovalsAccessReport } from './definitions/credential-approvals-access';
import { auditExportReport } from './definitions/audit-export';

export const ALL_REPORTS: ReportDefinition[] = [
  hardwarePerEmployeeReport,
  assetsByCategoryDepartmentReport,
  assignedVsUnassignedReport,
  softwareLicenseUtilizationReport,
  warrantyExpiryReport,
  repairHistoryReport,
  requestTurnaroundSlaReport,
  offboardingStatusReport,
  credentialApprovalsAccessReport,
  auditExportReport,
];

const reportMap = new Map<string, ReportDefinition>(ALL_REPORTS.map((r) => [r.key, r]));

export function getReport(key: string): ReportDefinition | undefined {
  return reportMap.get(key);
}

export function getAllReports(): ReportDefinition[] {
  return ALL_REPORTS;
}

export function normalizeRoleKey(roleName?: string): string {
  if (!roleName) return '';
  const clean = roleName.toLowerCase().replace(/[\s_-]/g, '');
  if (clean === 'superadmin' || clean === 'admin') return 'super_admin';
  if (clean === 'hardwaremanager' || clean === 'hardware') return 'hardware_manager';
  if (clean === 'hrmanager' || clean === 'hr') return 'hr_manager';
  if (clean === 'employee') return 'employee';
  return roleName.toLowerCase();
}

export function getReportsForRole(roleName: string): ReportDefinition[] {
  if (!roleName) return [];
  const normalized = normalizeRoleKey(roleName);
  return ALL_REPORTS.filter(
    (r) =>
      r.allowedRoles.includes(roleName) ||
      r.allowedRoles.includes(normalized) ||
      (normalized === 'super_admin' &&
        (r.allowedRoles.includes('super_admin') || r.allowedRoles.includes('admin'))),
  );
}

export function canRoleAccessReport(roleName: string, reportKey: string): boolean {
  const rep = reportMap.get(reportKey);
  if (!rep) return false;
  const normalized = normalizeRoleKey(roleName);
  return (
    rep.allowedRoles.includes(roleName) ||
    rep.allowedRoles.includes(normalized) ||
    (normalized === 'super_admin' &&
      (rep.allowedRoles.includes('super_admin') || rep.allowedRoles.includes('admin')))
  );
}
