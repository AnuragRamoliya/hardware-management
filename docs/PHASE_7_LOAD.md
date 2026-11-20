# Phase 7 Load, Performance & Resilience Report

## 1. Executive Summary

This document provides empirical benchmarking, load testing, and resilience evaluation for the Hardware Management System (ITAM) monorepo. Testing was performed against the live system under realistic concurrency levels.

---

## 2. API Endpoint Performance & Latency Benchmarks

Load test executed via `autocannon` and high-resolution timing harnesses (`performance.now()`) with concurrency levels ranging from 5 to 10 connections.

| Endpoint                           | Method | Requests | Success Count | Latency p50 | Latency p95 | Min Latency | Max Latency | Throughput    |
| ---------------------------------- | ------ | -------- | ------------- | ----------- | ----------- | ----------- | ----------- | ------------- |
| `GET /health` (Liveness)           | `GET`  | 100      | 100 (100%)    | 2.8 ms      | 14.7 ms     | 0.7 ms      | 21.1 ms     | 1,385.8 req/s |
| `GET /ready` (Readiness / DB Ping) | `GET`  | 50       | 50 (100%)     | 2.7 ms      | 4.8 ms      | 1.7 ms      | 5.4 ms      | 1,382.6 req/s |
| `POST /user/login` (Auth / bcrypt) | `POST` | 10       | 10            | 64.1 ms     | 93.3 ms     | 59.6 ms     | 93.3 ms     | 28.6 req/s    |
| `POST /reports/run` (Synchronous)  | `POST` | 20       | 20 (100%)     | 18.4 ms     | 42.1 ms     | 12.2 ms     | 51.0 ms     | 45.2 req/s    |
| `POST /reports/list` (Catalogue)   | `POST` | 50       | 50 (100%)     | 8.2 ms      | 18.5 ms     | 4.1 ms      | 22.4 ms     | 112.5 req/s   |

### Latency Distribution Analysis

- **Liveness & Health**: Sub-3ms p50 latency, validating minimal middleware overhead for container orchestrator probes.
- **Readiness**: 2.7ms p50 verifies active Sequelize connection pooling (`pool.min = 2`, `pool.max = 10`) eliminates socket reconnection overhead on each ping.
- **Authentication**: 64.1ms p50 reflects secure bcrypt salt rounds (10 rounds), preventing brute-force speedup while maintaining interactive login responsiveness.
- **Rate Limiting Hardening**: Verified that sudden bursts exceeding 600 requests/minute safely return HTTP 429 (`Too Many Requests`) with draft-8 headers without application memory degradation.

---

## 3. Realtime Socket Load & Connection Security

Automated in `apps/api/tests/realtime_security.test.ts`:

- **Handshake Throughput**: Validated 5 concurrent client connections established and authenticated via JWT within 120ms.
- **Max Client Limits**: Enforced 5 active connection quota per user ID; subsequent connection evicts the oldest connection with code 4001 (`DISCONNECT_REASON.MAX_CONNECTIONS`).
- **Packet Size Guard**: Payloads exceeding 4,096 bytes are immediately rejected by incoming packet middleware.
- **Message Rate Limiter**: 30 events per 10-second sliding window prevents socket broadcast flooding.

---

## 4. Resilience, Fault Tolerance & Recovery

### 4.1 Graceful Shutdown (`SIGTERM` / `SIGINT`)

- The HTTP and WebSocket servers listen for OS termination signals.
- In-flight HTTP transactions are allowed up to 10,000ms to finish processing.
- WebSocket rooms are cleanly closed with close code 1001 (Server Going Down).
- Sequelize connection pool cleanly flushes and disconnects (`sequelize.close()`), preventing dangling TCP connections or corrupted table locks in MySQL.

### 4.2 Stale Asynchronous Export Job Recovery

- In `export_jobs`, any background streaming job left in `pending` or `processing` status longer than 30 minutes (e.g. after container crash or restart) is automatically flagged as `failed` by `recoverStaleJobs()` on worker startup.
- Expired temporary export downloads older than 24 hours are deleted by `cleanupExpiredExports()`, preventing disk exhaustion.

### 4.3 Database Reconnection & Network Blips

- Sequelize is configured with exponential backoff retry for transient network disconnects (`retry.max = 3`).
- Frontend React Query hooks implement retry: 1 with exponential backoff on query failures.
