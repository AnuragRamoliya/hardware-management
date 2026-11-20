import { Op } from 'sequelize';
import { AssetRecord as assets } from '../Models/assets';
import { SoftwareLicenseRecord } from '../Models/software_license';
import { SoftwareRecord, SoftwareAssignmentRecord } from '../Models/software';
import {
  offboarding_cases,
  offboarding_tasks,
  requests,
  employees,
  roles,
  asset_assignments,
} from '../Database/Schema';
import { STATUS } from '@hm/shared';
import { normalizeRoleKey } from '../Reports/registry';
import { parseDateBounds } from '../Reports/helpers';
import type { UserInfo } from '../Types/api';

export interface DashboardFilterOptions {
  department_id?: number | string;
  start_date?: string;
  end_date?: string;
}

export class DashboardService {
  async summary(actor?: UserInfo, filterOptions: DashboardFilterOptions = {}) {
    let roleName = '';
    if (actor) {
      if (typeof actor.role === 'string') {
        roleName = actor.role;
      } else if (actor.role && typeof actor.role === 'object' && 'name' in actor.role) {
        roleName = actor.role.name;
      } else if (actor.role_name) {
        roleName = actor.role_name;
      } else if (actor.role_id) {
        const r = await roles.findByPk(actor.role_id, { attributes: ['name'], raw: true });
        roleName = (r as unknown as { name?: string })?.name || '';
      }
    }

    roleName = normalizeRoleKey(roleName);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDays = new Date(today.getTime() + 30 * 86400000);

    const dateBounds = parseDateBounds(filterOptions.start_date, filterOptions.end_date);
    const dateWhere = dateBounds
      ? { createdAt: { [Op.between]: [dateBounds.start, dateBounds.end] } }
      : {};

    // HR Dashboard
    if (roleName === 'hr') {
      const [totalCases, openCases, pendingTasks, pendingRequests] = await Promise.all([
        offboarding_cases.count({ where: { status: STATUS.ACTIVE, ...dateWhere } }),
        offboarding_cases.count({
          where: {
            status: STATUS.ACTIVE,
            case_status: { [Op.in]: ['open', 'in_progress'] },
            ...dateWhere,
          },
        }),
        offboarding_tasks.count({
          where: {
            status: STATUS.ACTIVE,
            task_status: { [Op.notIn]: ['completed', 'waived'] },
          },
        }),
        requests.count({
          where: { status: STATUS.ACTIVE, request_status: { [Op.in]: [1, 2] }, ...dateWhere },
        }),
      ]);

      return {
        role: 'hr',
        totalOffboardingCases: totalCases,
        openOffboardingCases: openCases,
        pendingOffboardingTasks: pendingTasks,
        pendingRequests,
        quickReports: ['offboarding-status', 'request-turnaround-sla'],
      };
    }

    // Employee Dashboard: Strictly scoped to employee's own items only
    if (roleName === 'employee') {
      let empId: number | null = null;
      if (actor) {
        const emp = await employees.findOne({
          where: {
            [Op.or]: [{ user_id: actor.id }, { email: actor.email }],
            status: STATUS.ACTIVE,
          },
          attributes: ['id'],
          raw: true,
        });
        if (emp) empId = Number((emp as unknown as { id: number }).id);
      }

      const [myRequestsCount, myActiveRequests, myAssignedAssets] = await Promise.all([
        empId
          ? requests.count({ where: { employee_id: empId, status: STATUS.ACTIVE, ...dateWhere } })
          : 0,
        empId
          ? requests.count({
              where: {
                employee_id: empId,
                status: STATUS.ACTIVE,
                request_status: { [Op.in]: [1, 2, 3] },
                ...dateWhere,
              },
            })
          : 0,
        empId
          ? asset_assignments.count({
              where: { employee_id: empId, returned_at: null, status: STATUS.ACTIVE },
            })
          : 0,
      ]);

      return {
        role: 'employee',
        myRequestsCount,
        myActiveRequests,
        myAssignedAssets,
      };
    }

    // Default / Super Admin / Hardware Manager Dashboard
    const [
      totalAssets,
      available,
      assigned,
      inRepair,
      expiringWarranties,
      softwareCount,
      expiringLicenses,
      licenseRows,
      activeAssignments,
      openRequests,
      openOffboardings,
    ] = await Promise.all([
      assets.count({ where: { status: 1 } }),
      assets.count({ where: { status: 1, asset_status: 1 } }),
      assets.count({ where: { status: 1, asset_status: 2 } }),
      assets.count({ where: { status: 1, asset_status: 4 } }),
      assets.count({ where: { status: 1, warranty_end: { [Op.between]: [today, thirtyDays] } } }),
      SoftwareRecord.count({ where: { status: 1 } }),
      SoftwareLicenseRecord.count({
        where: { status: 1, expiry_date: { [Op.between]: [today, thirtyDays] } },
      }),
      SoftwareLicenseRecord.findAll({ where: { status: 1 }, attributes: ['seats_total'] }),
      SoftwareAssignmentRecord.count({ where: { status: 1, revoked_at: null } }),
      requests.count({
        where: { status: STATUS.ACTIVE, request_status: { [Op.in]: [1, 2] }, ...dateWhere },
      }),
      offboarding_cases.count({
        where: {
          status: STATUS.ACTIVE,
          case_status: { [Op.in]: ['open', 'in_progress'] },
          ...dateWhere,
        },
      }),
    ]);

    const seatsTotal = licenseRows.reduce((sum, row) => sum + Number(row.get('seats_total')), 0);

    return {
      role: roleName || 'hardware_manager',
      totalAssets,
      available,
      assigned,
      inRepair,
      expiringWarranties,
      softwareCount,
      expiringLicenses,
      seatsTotal,
      seatsUsed: activeAssignments,
      seatsAvailable: Math.max(0, seatsTotal - activeAssignments),
      openRequests,
      openOffboardings,
      quickReports: [
        'hardware-per-employee',
        'assets-by-category-department',
        'assigned-vs-unassigned',
        'warranty-expiry',
        'software-license-utilization',
      ],
    };
  }
}
