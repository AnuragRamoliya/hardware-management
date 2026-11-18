import { Op } from 'sequelize';
import type { RowAttributes } from '../Database/Schema';
import { AssetRecord as assets } from '../Models/assets';
import { AssetAssignmentRecord as asset_assignments } from '../Models/asset_assignment';
import { SoftwareRecord as software } from '../Models/software';
import { SoftwareLicenseRecord as software_licenses } from '../Models/software_license';
import { NotificationRecord as notifications } from '../Models/notifications';

const dayMs = 86_400_000;
function remainingDays(value: unknown): number {
  const date = new Date(String(value));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / dayMs);
}
async function createAlert(kind: string, recordType: string, recordId: number, days: number, title: string, message: string) {
  const existing = await notifications.findOne({ where: { kind, record_type: recordType, record_id: recordId, threshold_days: days } });
  if (!existing) await notifications.create({ kind, record_type: recordType, record_id: recordId, threshold_days: days, title, message, status: 1 });
}
function threshold(days: number): number | undefined {
  if (days < 0 || days > 30) return undefined;
  return [7, 15, 30].find((limit) => days <= limit);
}

export async function runExpiryAlerts(): Promise<number> {
  let created = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 30 * dayMs);
  const [assetRows, softwareRows, licenseRows, assignmentRows] = await Promise.all([
    assets.findAll({ where: { status: 1, warranty_end: { [Op.between]: [today, limit] } } }),
    software.findAll({ where: { status: 1, renewal_date: { [Op.between]: [today, limit] } } }),
    software_licenses.findAll({ where: { status: 1, expiry_date: { [Op.between]: [today, limit] } } }),
    asset_assignments.findAll({ where: { status: 1, returned_at: null, due_return_date: { [Op.lt]: today } } }),
  ]);
  for (const row of assetRows) {
    const days = threshold(remainingDays(row.get('warranty_end')));
    if (days === undefined) continue;
    await createAlert('warranty_expiry', 'asset', Number(row.get('id')), days, 'Warranty expiring', `Asset ${String(row.get('asset_tag'))} warranty expires soon.`);
    created += 1;
  }
  for (const row of softwareRows) {
    const days = threshold(remainingDays(row.get('renewal_date')));
    if (days === undefined) continue;
    await createAlert('software_renewal', 'software', Number(row.get('id')), days, 'Software renewal due', `${String(row.get('name'))} renewal is due soon.`);
    created += 1;
  }
  for (const row of licenseRows) {
    const days = threshold(remainingDays(row.get('expiry_date')));
    if (days === undefined) continue;
    await createAlert('license_expiry', 'software_license', Number(row.get('id')), days, 'License expiring', `Software license ${String(row.get('id'))} expires soon.`);
    created += 1;
  }
  for (const row of assignmentRows) {
    await createAlert('asset_overdue', 'asset_assignment', Number(row.get('id')), 0, 'Asset return overdue', `Asset assignment ${String(row.get('id'))} is past its return date.`);
    created += 1;
  }
  return created;
}

export class NotificationService {
  async list(): Promise<RowAttributes[]> {
    const rows = await notifications.findAll({ where: { status: 1 }, order: [['createdAt', 'DESC']], limit: 100 });
    return rows.map((row) => row.get({ plain: true }) as RowAttributes);
  }

  async markRead(id: number): Promise<void> {
    await notifications.update({ read_at: new Date() }, { where: { id, status: 1, read_at: null } });
  }
}
