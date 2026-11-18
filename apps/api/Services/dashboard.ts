import { Op } from 'sequelize';
import { AssetRecord as assets } from '../Models/assets';
import { SoftwareLicenseRecord } from '../Models/software_license';
import { SoftwareRecord, SoftwareAssignmentRecord } from '../Models/software';

export class DashboardService {
  async summary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDays = new Date(today.getTime() + 30 * 86400000);
    const [totalAssets, available, assigned, inRepair, expiringWarranties, softwareCount, expiringLicenses, licenseRows, activeAssignments] = await Promise.all([
      assets.count({ where: { status: 1 } }),
      assets.count({ where: { status: 1, asset_status: 1 } }),
      assets.count({ where: { status: 1, asset_status: 2 } }),
      assets.count({ where: { status: 1, asset_status: 4 } }),
      assets.count({ where: { status: 1, warranty_end: { [Op.between]: [today, thirtyDays] } } }),
      SoftwareRecord.count({ where: { status: 1 } }),
      SoftwareLicenseRecord.count({ where: { status: 1, expiry_date: { [Op.between]: [today, thirtyDays] } } }),
      SoftwareLicenseRecord.findAll({ where: { status: 1 }, attributes: ['seats_total'] }),
      SoftwareAssignmentRecord.count({ where: { status: 1, revoked_at: null } }),
    ]);
    const seatsTotal = licenseRows.reduce((sum, row) => sum + Number(row.get('seats_total')), 0);
    return { totalAssets, available, assigned, inRepair, expiringWarranties, softwareCount, expiringLicenses, seatsTotal, seatsUsed: activeAssignments, seatsAvailable: Math.max(0, seatsTotal - activeAssignments) };
  }
}
