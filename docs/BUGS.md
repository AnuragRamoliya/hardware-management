# Phase 8 Defect & Bug Register

## Severity Classification

- **S1 (Critical)**: Data loss, data corruption, severe security vulnerability (auth bypass, unhashed secrets, privilege escalation, IDOR), server crash / unhandled exception.
- **S2 (Major)**: Core business function completely broken, wrong business calculation, incorrect state transition, concurrency violation (double-claim, double-assignment).
- **S3 (Minor)**: Non-blocking functional defect, minor UX/validation inconsistency with workaround, subtle edge case formatting.
- **S4 (Cosmetic)**: Visual imperfection, minor alignment/typography defect, typo in non-critical copy, cosmetic layout shift.

---

## Metrics Summary

| Severity          | Found | Fixed | Open | Moved to Backlog |
| :---------------- | :---- | :---- | :--- | :--------------- |
| **S1 (Critical)** | 0     | 0     | 0    | 0                |
| **S2 (Major)**    | 1     | 1     | 0    | 0                |
| **S3 (Minor)**    | 0     | 0     | 0    | 0                |
| **S4 (Cosmetic)** | 0     | 0     | 0    | 0                |
| **Total**         | 1     | 1     | 0    | 0                |

---

## Detailed Bug Register

| ID          | Sev | Module                       | Title                                                                                              | Steps to Reproduce                                                                                                                                 | Expected Result                            | Actual Result                                                                 | Root Cause                                                                                           | Status | Fix Commit | Regression Test                                   |
| :---------- | :-- | :--------------------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------- | :---------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :----- | :--------- | :------------------------------------------------ |
| **BUG-001** | S2  | Pure Utils / Options Builder | SQL 3VL bug causes records with NULL search fields to disappear from prefix/contains search phases | 1. Create record with null optional search field (e.g. `contact_name: null` on vendor).<br>2. Call options search with prefix query matching name. | Record is returned in prefix search phase. | Record omitted because SQL `NOT (col = ?)` evaluates to NULL instead of TRUE. | SQL Three-Valued Logic: `NOT (UNKNOWN)` yields `UNKNOWN` (falsy in WHERE). Fixed with `IS NOT TRUE`. | Fixed  | d44d551    | `tests/options_builder_bug001_regression.test.ts` |

---

## Late-Discovered Bug Escape Analysis

| Bug ID   | Severity | Root Cause | Why Previous Gate Missed It | Required Test to Prevent Recurrence |
| :------- | :------- | :--------- | :-------------------------- | :---------------------------------- |
| _(None)_ |          |            |                             |                                     |
