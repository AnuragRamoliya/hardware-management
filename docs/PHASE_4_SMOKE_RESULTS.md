# Phase 4 Smoke & Performance Benchmark Results

Date: 2026-11-23
Environment: Local test database (`hardware_app`), Node.js v22, Linux
Dataset: 20083 requests indexed in database
Iterations: 50 samples per endpoint

## Latency Metrics (Target: p95 < 200ms)

| Endpoint / Operation                                    | Total Samples | Min (ms) | p50 Median (ms) | p95 Latency (ms) | Max (ms) | Status    |
| :------------------------------------------------------ | :------------ | :------- | :-------------- | :--------------- | :------- | :-------- |
| **POST `/requests/list`** (Paginated + Priority filter) | 50            | 10.96    | **12.81**       | **17.25**        | 30.5     | ✅ PASSED |
| **GET `/requests/stats`** (Full Queue KPI Aggregation)  | 50            | 45.7     | **51.52**       | **93.54**        | 115.11   | ✅ PASSED |

## Validation Summary

1. **Volume Handling**: Successfully queried database containing 20083 request rows without table locks or memory degradation.
2. **Indexing Efficacy**: Composite index on `(request_status, priority, createdAt)` delivers p95 latency of 17.25ms, well within the 200ms SLA threshold.
3. **Queue Stats Scalability**: Grouped aggregations across priorities, awaiting stock flags, and SLA breach indicators execute with p95 latency of 93.54ms.
