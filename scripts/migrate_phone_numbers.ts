import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "node:path";
import { validatePhoneNumber } from "@hm/shared";

dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });

const seq = new Sequelize(
  process.env.DB_DATABASE || "hardware_store",
  process.env.DB_USERNAME || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
  },
);

export async function runPhoneMigration(isRollback = false) {
  console.log(
    `Starting Phone Migration (${isRollback ? "ROLLBACK" : "APPLY"})...`,
  );

  // Ensure log table exists
  await seq.query(`
    CREATE TABLE IF NOT EXISTS phone_migration_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(64) NOT NULL,
      record_id INT NOT NULL,
      old_value VARCHAR(50),
      new_value VARCHAR(50),
      status VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_table_record (table_name, record_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  if (isRollback) {
    const [logs] = (await seq.query(`
      SELECT * FROM phone_migration_logs WHERE status = 'NORMALIZED' ORDER BY id DESC
    `)) as unknown as [
      Array<{ table_name: string; record_id: number; old_value: string }>,
    ];

    for (const log of logs) {
      await seq.query(
        `UPDATE \`${log.table_name}\` SET phone = ? WHERE id = ?`,
        { replacements: [log.old_value, log.record_id] },
      );
    }
    console.log(
      `Reverted ${logs.length} normalized phone records back to original values.`,
    );
    return;
  }

  const tables = ["employees", "vendors"];
  let totalNormalized = 0;
  let totalUnchanged = 0;

  for (const table of tables) {
    const [rows] = (await seq.query(`
      SELECT id, phone FROM \`${table}\`
      WHERE phone IS NOT NULL AND phone != ''
    `)) as unknown as [Array<{ id: number; phone: string }>];

    for (const row of rows) {
      // If already in E.164, skip
      if (
        row.phone.startsWith("+") &&
        !row.phone.includes(" ") &&
        !row.phone.includes("-")
      ) {
        totalUnchanged++;
        continue;
      }

      const validation = validatePhoneNumber(row.phone, "IN");
      if (validation.valid && validation.e164) {
        // Record log and update
        await seq.query(
          `INSERT INTO phone_migration_logs (table_name, record_id, old_value, new_value, status)
           VALUES (?, ?, ?, ?, 'NORMALIZED')`,
          { replacements: [table, row.id, row.phone, validation.e164] },
        );
        await seq.query(`UPDATE \`${table}\` SET phone = ? WHERE id = ?`, {
          replacements: [validation.e164, row.id],
        });
        totalNormalized++;
      } else {
        // Log unparseable for owner visibility, leave unchanged in DB
        await seq.query(
          `INSERT INTO phone_migration_logs (table_name, record_id, old_value, new_value, status)
           VALUES (?, ?, ?, NULL, 'UNPARSEABLE')`,
          { replacements: [table, row.id, row.phone] },
        );
        totalUnchanged++;
      }
    }
  }

  console.log(
    `Migration Complete: ${totalNormalized} normalized, ${totalUnchanged} unchanged/unparseable.`,
  );
  await seq.close();
}

if (process.argv[1]?.endsWith("migrate_phone_numbers.ts")) {
  const isRollback = process.argv.includes("--rollback");
  runPhoneMigration(isRollback).catch(console.error);
}
