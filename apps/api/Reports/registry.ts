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

export function getReportsForRole(roleName: string): ReportDefinition[] {
  if (!roleName) return [];
  return ALL_REPORTS.filter((r) => r.allowedRoles.includes(roleName));
}

export function canRoleAccessReport(roleName: string, reportKey: string): boolean {
  const rep = reportMap.get(reportKey);
  if (!rep) return false;
  return rep.allowedRoles.includes(roleName);
}
