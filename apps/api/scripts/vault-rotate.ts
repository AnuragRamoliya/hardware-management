import { Op, type Transaction } from 'sequelize';
import { sequelize } from '../Config/database';
import { credentials } from '../Database/Schema';
import { decryptSecret, encryptSecret, getActiveKeyVersion, buildAAD } from '../Utils/vault_crypto';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const targetVersion = getActiveKeyVersion();

  console.log(`[Vault Key Rotation] Target key version: ${targetVersion}`);
  if (isDryRun) {
    console.log('[Vault Key Rotation] DRY RUN MODE — No changes will be written to database.');
  }

  await sequelize.authenticate();
  console.log('[Vault Key Rotation] Database connection established.');

  const outdated = await credentials.scope('withSecret').findAll({
    where: {
      key_version: { [Op.ne]: targetVersion },
      status: { [Op.ne]: 2 },
    },
    attributes: ['id', 'employee_id', 'password_enc', 'iv', 'auth_tag', 'key_version'],
  });

  console.log(`[Vault Key Rotation] Found ${outdated.length} credential(s) needing re-encryption.`);

  if (outdated.length === 0) {
    console.log(
      '[Vault Key Rotation] All active credentials are on the current key version. Nothing to do.',
    );
    process.exit(0);
  }

  if (isDryRun) {
    console.log('[Vault Key Rotation] Dry run complete. Exiting.');
    process.exit(0);
  }

  const batchSize = 100;
  let rotatedCount = 0;

  for (let i = 0; i < outdated.length; i += batchSize) {
    const batch = outdated.slice(i, i + batchSize);
    await sequelize.transaction(async (tx: Transaction) => {
      for (const record of batch) {
        const row = record.get({ plain: true }) as {
          id: number;
          employee_id: number;
          password_enc: string;
          iv: string;
          auth_tag: string;
          key_version: string;
        };

        const aad = buildAAD(row.id, row.employee_id);
        const plaintext = decryptSecret(
          row.password_enc,
          row.iv,
          row.auth_tag,
          row.key_version,
          aad,
        );

        const reEncrypted = encryptSecret(plaintext, aad, targetVersion);

        await credentials.update(
          {
            password_enc: reEncrypted.ciphertext,
            iv: reEncrypted.iv,
            auth_tag: reEncrypted.authTag,
            key_version: reEncrypted.keyVersion,
          },
          {
            where: { id: row.id },
            transaction: tx,
          },
        );
        rotatedCount++;
      }
    });
    console.log(
      `[Vault Key Rotation] Progress: ${rotatedCount} / ${outdated.length} records rotated.`,
    );
  }

  console.log(
    `[Vault Key Rotation] SUCCESS: ${rotatedCount} credential(s) successfully rotated to key version ${targetVersion}.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[Vault Key Rotation] FATAL ERROR:', (err as Error).message);
  process.exit(1);
});
