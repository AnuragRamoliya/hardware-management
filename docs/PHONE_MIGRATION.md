# Phone Migration & Normalization Report

## Database Column Width Audit

| Table       | Column  | Type      | Maximum Length    | E.164 Requirement | Widen Required?     |
| :---------- | :------ | :-------- | :---------------- | :---------------- | :------------------ |
| `employees` | `phone` | `VARCHAR` | 50                | <= 16 chars       | **No** (Already 50) |
| `vendors`   | `phone` | `VARCHAR` | 50                | <= 16 chars       | **No** (Already 50) |
| `users`     | `phone` | N/A       | (No phone column) | N/A               | None                |
| `locations` | `phone` | N/A       | (No phone column) | N/A               | None                |

## Data Analysis & Dry Run Counts

Per security and privacy guidelines, no raw phone numbers are displayed in this report. Records are identified only by table name and primary key ID.

| Table       | Total Records | Populated Phone Count | Parseable (E.164 Valid) | Ambiguous | Unparseable / Format Invalid | Action Taken                                 |
| :---------- | :------------ | :-------------------- | :---------------------- | :-------- | :--------------------------- | :------------------------------------------- |
| `employees` | 100,061       | 8                     | 1                       | 0         | 7                            | 1 normalized to E.164, 7 preserved unchanged |
| `vendors`   | 13            | 2                     | 1                       | 0         | 1                            | 1 normalized to E.164, 1 preserved unchanged |
| **Total**   | **100,074**   | **10**                | **2**                   | **0**     | **8**                        | **2 normalized, 8 preserved**                |

## Unparseable Record Details (For Owner Review)

The following records have invalid format strings in the source database (e.g. truncated test fixture mock strings lacking area codes like `555-0199`). Per the golden rule, these original strings are preserved in the database and logged in `phone_migration_logs`.

- `employees` ID 1399037: Invalid length/format (test mock)
- `employees` ID 1399041: Invalid length/format (test mock)
- `employees` ID 1399050: Invalid length/format (test mock)
- `employees` ID 1399054: Invalid length/format (test mock)
- `employees` ID 1399059: Invalid length/format (test mock)
- `employees` ID 1399064: Invalid length/format (test mock)
- `employees` ID 1399069: Invalid length/format (test mock)
- `vendors` ID 2: Invalid length/format (test mock)

## Migration Execution & Reversibility

1. **Reversible Logging Table**:
   All normalization operations insert an audit trail record into `phone_migration_logs`:
   ```sql
   CREATE TABLE phone_migration_logs (
     id INT AUTO_INCREMENT PRIMARY KEY,
     table_name VARCHAR(64) NOT NULL,
     record_id INT NOT NULL,
     old_value VARCHAR(50),
     new_value VARCHAR(50),
     status VARCHAR(32) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **Apply Script**:
   `npx tsx scripts/migrate_phone_numbers.ts`
3. **Rollback Script**:
   `npx tsx scripts/migrate_phone_numbers.ts --rollback`
4. **Idempotency**:
   Running the script multiple times produces identical results without duplicate transformations or data loss.
