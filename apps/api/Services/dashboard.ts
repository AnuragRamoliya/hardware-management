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
} from '../Database/Schema';
import { STATUS } from '@hm/shared';
import type { UserInfo } from '../Types/api';

export class DashboardService {
  async summary(actor?: UserInfo) {
    let roleName = '';
    if (actor && actor.role_id) {
      const r = await roles.findByPk(actor.role_id, { attributes: ['name'], raw: true });
      roleName = (r as unknown as { name?: string })?.name || '';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDays = new Date(today.getTime() + 30 * 86400000);

    // HR Dashboard
    if (roleName === 'hr') {
      const [totalCases, openCases, pendingTasks, pendingRequests] = await Promise.all([
        offboarding_cases.count({ where: { status: STATUS.ACTIVE } }),
        offboarding_cases.count({
          where: { status: STATUS.ACTIVE, case_status: { [Op.in]: ['open', 'in_progress'] } },
        }),
        offboarding_tasks.count({
          where: {
            status: STATUS.ACTIVE,
            task_status: { [Op.notIn]: ['completed', 'waived'] },
          },
        }),
        requests.count({
          where: { status: STATUS.ACTIVE, request_status: { [Op.in]: [1, 2] } },
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

    // Employee Dashboard
    if (roleName === 'employee') {
      let empId: number | null = null;
      if (actor) {
        const emp = await employees.findOne({
          where: { user_id: actor.id, status: STATUS.ACTIVE },
          attributes: ['id'],
          raw: true,
        });
        if (emp) empId = Number((emp as unknown as { id: number }).id);
      }

      const [myRequestsCount, myActiveRequests] = await Promise.all([
        empId ? requests.count({ where: { employee_id: empId, status: STATUS.ACTIVE } }) : 0,
        empId
          ? requests.count({
              where: {
                employee_id: empId,
                status: STATUS.ACTIVE,
                request_status: { [Op.in]: [1, 2, 3] },
              },
            })
          : 0,
      ]);

      return {
        role: 'employee',
        myRequestsCount,
        myActiveRequests,
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
      requests.count({ where: { status: STATUS.ACTIVE, request_status: { [Op.in]: [1, 2] } } }),
      offboarding_cases.count({
        where: { status: STATUS.ACTIVE, case_status: { [Op.in]: ['open', 'in_progress'] } },
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
