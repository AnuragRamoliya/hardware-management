import { Op } from 'sequelize';
import type { RowAttributes } from '../Database/Schema';
import { AssetRecord as assets } from '../Models/assets';
import { AssetAssignmentRecord as asset_assignments } from '../Models/asset_assignment';
import { SoftwareRecord as software } from '../Models/software';
import { SoftwareLicenseRecord as software_licenses } from '../Models/software_license';
import { NotificationRecord as notifications } from '../Models/notifications';
import { credentials, credential_collection_requests } from '../Database/Schema';
import { COLLECTION_REQUEST_STATUS, CREDENTIAL_APPROVAL_STATUS } from '@hm/shared';

const dayMs = 86_400_000;
function remainingDays(value: unknown): number {
  const date = new Date(String(value));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / dayMs);
}
async function createAlert(
  kind: string,
  recordType: string,
  recordId: number,
  days: number,
  title: string,
  message: string,
) {
  const existing = await notifications.findOne({
    where: { kind, record_type: recordType, record_id: recordId, threshold_days: days },
  });
  if (!existing)
    await notifications.create({
      kind,
      record_type: recordType,
      record_id: recordId,
      threshold_days: days,
      title,
      message,
      status: 1,
    });
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
    software_licenses.findAll({
      where: { status: 1, expiry_date: { [Op.between]: [today, limit] } },
    }),
    asset_assignments.findAll({
      where: { status: 1, returned_at: null, due_return_date: { [Op.lt]: today } },
    }),
  ]);
  for (const row of assetRows) {
    const days = threshold(remainingDays(row.get('warranty_end')));
    if (days === undefined) continue;
    await createAlert(
      'warranty_expiry',
      'asset',
      Number(row.get('id')),
      days,
      'Warranty expiring',
      `Asset ${String(row.get('asset_tag'))} warranty expires soon.`,
    );
    created += 1;
  }
  for (const row of softwareRows) {
    const days = threshold(remainingDays(row.get('renewal_date')));
    if (days === undefined) continue;
    await createAlert(
      'software_renewal',
      'software',
      Number(row.get('id')),
      days,
      'Software renewal due',
      `${String(row.get('name'))} renewal is due soon.`,
    );
    created += 1;
  }
  for (const row of licenseRows) {
    const days = threshold(remainingDays(row.get('expiry_date')));
    if (days === undefined) continue;
    await createAlert(
      'license_expiry',
      'software_license',
      Number(row.get('id')),
      days,
      'License expiring',
      `Software license ${String(row.get('id'))} expires soon.`,
    );
    created += 1;
  }
  for (const row of assignmentRows) {
    await createAlert(
      'asset_overdue',
      'asset_assignment',
      Number(row.get('id')),
      0,
      'Asset return overdue',
      `Asset assignment ${String(row.get('id'))} is past its return date.`,
    );
    created += 1;
  }
  return created;
}

export async function runCredentialVaultJobs(): Promise<{
  expiring: number;
  overdue: number;
  pending: number;
}> {
  let expiring = 0;
  let overdue = 0;
  let pending = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 30 * dayMs);

  // 1. Expiring credentials
  const expiringCreds = await credentials.findAll({
    where: {
      status: 1,
      expires_at: { [Op.between]: [today, limit] },
    },
  });

  for (const row of expiringCreds) {
    const days = threshold(remainingDays(row.get('expires_at')));
    if (days === undefined) continue;
    await createAlert(
      'credential_expiry',
      'credential',
      Number(row.get('id')),
      days,
      'Credential Expiring Soon',
      `Credential "${String(row.get('label'))}" expires in ${days} days.`,
    );
    expiring += 1;
  }

  // 2. Overdue collection requests
  const overdueRequests = await credential_collection_requests.findAll({
    where: {
      status: 1,
      request_status: COLLECTION_REQUEST_STATUS.PENDING,
      due_date: { [Op.lt]: today },
    },
  });

  for (const req of overdueRequests) {
    await req.update({ request_status: COLLECTION_REQUEST_STATUS.OVERDUE });
    await createAlert(
      'credential_request_overdue',
      'credential_collection_request',
      Number(req.get('id')),
      0,
      'Credential Collection Overdue',
      `Credential collection request #${req.get('id')} is past its due date.`,
    );
    overdue += 1;
  }

  // 3. Pending approvals summary
  const pendingCount = await credentials.count({
    where: {
      status: 1,
      approval_status: CREDENTIAL_APPROVAL_STATUS.PENDING,
    },
  });

  if (pendingCount > 0) {
    pending = pendingCount;
  }

  return { expiring, overdue, pending };
}

export class NotificationService {
  async list(): Promise<RowAttributes[]> {
    const rows = await notifications.findAll({
      where: { status: 1 },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return rows.map((row) => row.get({ plain: true }) as RowAttributes);
  }

  async markRead(id: number): Promise<void> {
    await notifications.update(
      { read_at: new Date() },
      { where: { id, status: 1, read_at: null } },
    );
  }
}
