# Phase 4 Smoke & Performance Benchmark Results

Date: 2026-11-20
Environment: Local test database (`hardware_app`), Node.js v22, Linux
Dataset: 20082 requests indexed in database
Iterations: 50 samples per endpoint

## Latency Metrics (Target: p95 < 200ms)

| Endpoint / Operation                                    | Total Samples | Min (ms) | p50 Median (ms) | p95 Latency (ms) | Max (ms) | Status    |
| :------------------------------------------------------ | :------------ | :------- | :-------------- | :--------------- | :------- | :-------- |
| **POST `/requests/list`** (Paginated + Priority filter) | 50            | 23.7     | **25.36**       | **30.74**        | 39.09    | ✅ PASSED |
| **GET `/requests/stats`** (Full Queue KPI Aggregation)  | 50            | 43.51    | **45.05**       | **57.45**        | 59.23    | ✅ PASSED |

## Validation Summary

1. **Volume Handling**: Successfully queried database containing 20082 request rows without table locks or memory degradation.
2. **Indexing Efficacy**: Composite index on `(request_status, priority, createdAt)` delivers p95 latency of 30.74ms, well within the 200ms SLA threshold.
3. **Queue Stats Scalability**: Grouped aggregations across priorities, awaiting stock flags, and SLA breach indicators execute with p95 latency of 57.45ms.
