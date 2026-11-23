# Module Test Matrix (T1 - T10 Coverage)

## Test Categories

- **T1**: Happy path per endpoint
- **T2**: Field validation per field (required, type, min/max/boundary, format, enum, duplicate, non-existent ID)
- **T3**: Permissions per role (401 / 403 / own-data isolation)
- **T4**: State transitions (legal vs illegal)
- **T5**: Edge cases (empty, max length, unicode, special characters, bulk limits)
- **T6**: Concurrency (race conditions, double assignment)
- **T7**: Transactions, rollback, audit log, notification, and realtime side effects
- **T8**: UI form behaviour (field types, dirty-state guard, validation display, focus to first error)
- **T9**: Responsive layout & accessibility (0 horizontal scroll, visual viewport fit, touch targets >= 44x44px, 0 axe violations)
- **T10**: Exports, reports, and background job side effects

## Module Coverage Grid

| Module                  |  T1  |  T2  |  T3  |  T4  |  T5  |  T6  |  T7  |  T8  |  T9  | T10  | Automated Test File                                       | Status   |
| :---------------------- | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :-------------------------------------------------------- | :------- |
| **Auth & Security**     | Pass | Pass | Pass | N/A  | Pass | Pass | Pass | Pass | Pass | N/A  | `tests/auth_rate_limit_lockout.test.ts`                   | Complete |
| **Users & Roles**       | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | N/A  | `tests/users_auth_matrix.test.ts`                         | Complete |
| **Employees**           | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | Pass | `tests/employees.test.ts`                                 | Complete |
| **Master Data**         | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | N/A  | `tests/master_data_comprehensive.test.ts`                 | Complete |
| **Assets & Hardware**   | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | `tests/assets_concurrency_fencing.test.ts`                | Complete |
| **Software & Licenses** | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A  | `tests/software_licenses.test.ts`                         | Complete |
| **Credential Vault**    | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | `tests/credential_crypto_compliance.test.ts`              | Complete |
| **Requests Workflow**   | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A  | `tests/request_duplicate_guard_bug004_regression.test.ts` | Complete |
| **Offboarding**         | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | `tests/offboarding_idempotency.test.ts`                   | Complete |
| **Notifications**       | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | N/A  | `tests/notification_preferences_regression.test.ts`       | Complete |
| **Reports & Exports**   | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | Pass | `tests/reports_http_matrix.test.ts`                       | Complete |
| **Audit Logs & Chain**  | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | N/A  | Pass | Pass | `tests/audit_hash_chain.test.ts`                          | Complete |
| **Portal Screens**      | Pass | Pass | Pass | Pass | Pass | N/A  | Pass | Pass | Pass | N/A  | `apps/web/e2e/responsive/`                                | Complete |

_(Will be expanded with granular test case mappings in Part E)_
