import { Op } from 'sequelize';
import { sequelize } from '../Config/database';
import { credential_access_logs, activity_logs } from '../Database/Schema';
import { verifyHashChain } from '../Utils/hash_chain';

interface AccessLogRow {
  id: number;
  credential_id: number;
  employee_id: number;
  accessed_by: number;
  action: string;
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  success: number | boolean;
  failure_reason?: string | null;
  accessed_at: string;
  prev_hash: string;
  hash: string;
}

interface ActivityLogRow {
  id: number;
  user_id?: number | null;
  module: string;
  module_id?: number | null;
  action: string;
  description: string;
  ip_address?: string | null;
  prev_hash?: string;
  hash?: string;
}

async function main() {
  console.log('[Audit Integrity Verifier] Connecting to database...');
  await sequelize.authenticate();

  console.log('[Audit Integrity Verifier] Fetching credential access logs...');
  const accessLogs = await credential_access_logs.findAll({
    order: [['id', 'ASC']],
  });

  const accessRows = accessLogs.map((r) => r.get({ plain: true })) as unknown as AccessLogRow[];

  const accessResult = verifyHashChain(accessRows, (r: AccessLogRow) => ({
    id: r.id,
    credential_id: r.credential_id,
    employee_id: r.employee_id,
    accessed_by: r.accessed_by,
    action: r.action,
    reason: r.reason ?? null,
    ip_address: r.ip_address ?? null,
    user_agent: r.user_agent ?? null,
    success: Number(r.success),
    failure_reason: r.failure_reason ?? null,
    accessed_at:
      (r.accessed_at as unknown) instanceof Date
        ? (r.accessed_at as unknown as Date).toISOString()
        : r.accessed_at,
  }));

  if (accessResult.valid) {
    console.log(
      `[Audit Integrity Verifier] credential_access_logs: PASS (${accessResult.totalVerified} records verified, hash chain intact).`,
    );
  } else {
    console.error(
      `[Audit Integrity Verifier] credential_access_logs: FAIL — ${accessResult.errorMessage}`,
    );
    process.exit(1);
  }

  console.log('[Audit Integrity Verifier] Fetching activity logs with hash chain...');
  const activityLogs = await activity_logs.findAll({
    where: {
      hash: { [Op.ne]: null },
    },
    order: [['id', 'ASC']],
  });

  const activityRows = activityLogs
    .map((r) => r.get({ plain: true }) as unknown as ActivityLogRow)
    .filter(
      (r): r is ActivityLogRow & { prev_hash: string; hash: string } =>
        typeof r.prev_hash === 'string' && typeof r.hash === 'string',
    );

  if (activityRows.length > 0) {
    const activityResult = verifyHashChain(activityRows, (r: ActivityLogRow) => ({
      id: r.id,
      module: r.module,
      module_id: r.module_id,
      action: r.action,
      description: r.description,
    }));

    if (activityResult.valid) {
      console.log(
        `[Audit Integrity Verifier] activity_logs: PASS (${activityResult.totalVerified} chained records verified).`,
      );
    } else {
      console.error(
        `[Audit Integrity Verifier] activity_logs: FAIL — ${activityResult.errorMessage}`,
      );
      process.exit(1);
    }
  } else {
    console.log('[Audit Integrity Verifier] activity_logs: No chained entries found yet.');
  }

  console.log('[Audit Integrity Verifier] ALL AUDIT CHAINS ARE VALID AND TAMPER-FREE.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Audit Integrity Verifier] FATAL ERROR:', (err as Error).message);
  process.exit(1);
});
