import http from "http";
import { performance } from "perf_hooks";

interface BenchmarkResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successRequests: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  throughputRps: number;
}

async function request(
  options: http.RequestOptions,
  body?: string,
): Promise<{ statusCode: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.request(options, (res) => {
      res.resume();
      res.on("end", () => {
        const duration = performance.now() - start;
        resolve({ statusCode: res.statusCode || 0, duration });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function benchmark(
  name: string,
  path: string,
  method = "GET",
  body?: string,
  headers: Record<string, string> = {},
  concurrency = 5,
  total = 50,
): Promise<BenchmarkResult> {
  const durations: number[] = [];
  let successCount = 0;
  const startAll = performance.now();

  const runBatch = async (count: number) => {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        (async () => {
          try {
            const reqHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              ...headers,
            };
            if (body) {
              reqHeaders["Content-Length"] = Buffer.byteLength(body).toString();
            }
            const res = await request(
              {
                hostname: "localhost",
                port: 8000,
                path,
                method,
                headers: reqHeaders,
              },
              body,
            );
            durations.push(res.duration);
            if (res.statusCode >= 200 && res.statusCode < 400) successCount++;
          } catch (e) {
            // ignore error
          }
        })(),
      );
    }
    await Promise.all(promises);
  };

  const batches = Math.ceil(total / concurrency);
  for (let b = 0; b < batches; b++) {
    await runBatch(concurrency);
  }

  const totalTimeSec = (performance.now() - startAll) / 1000;
  durations.sort((a, b) => a - b);

  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
  const min = durations[0] || 0;
  const max = durations[durations.length - 1] || 0;

  return {
    endpoint: path,
    method,
    totalRequests: durations.length,
    successRequests: successCount,
    p50Ms: Math.round(p50 * 10) / 10,
    p95Ms: Math.round(p95 * 10) / 10,
    p99Ms: Math.round(p99 * 10) / 10,
    minMs: Math.round(min * 10) / 10,
    maxMs: Math.round(max * 10) / 10,
    throughputRps: Math.round((durations.length / totalTimeSec) * 10) / 10,
  };
}

async function runAll() {
  console.log(
    "=== Executing Phase 7 Performance & Resilience Benchmark Suite ===\n",
  );

  // 1. Health Liveness
  const rHealth = await benchmark(
    "Health Liveness",
    "/health",
    "GET",
    undefined,
    {},
    10,
    100,
  );

  // 2. Ready Database Readiness
  const rReady = await benchmark(
    "Readiness Check",
    "/ready",
    "GET",
    undefined,
    {},
    5,
    50,
  );

  // 3. User Login
  const rLogin = await benchmark(
    "User Login",
    "/user/login",
    "POST",
    JSON.stringify({
      email: "admin@fixture.local",
      password: "TestPassword123!",
    }),
    {},
    2,
    10,
  );

  console.log(
    "| Endpoint | Method | Requests | Success | p50 (ms) | p95 (ms) | Min (ms) | Max (ms) | Throughput (req/s) |",
  );
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of [rHealth, rReady, rLogin]) {
    console.log(
      `| \`${r.endpoint}\` | \`${r.method}\` | ${r.totalRequests} | ${r.successRequests} | ${r.p50Ms} | ${r.p95Ms} | ${r.minMs} | ${r.maxMs} | ${r.throughputRps} |`,
    );
  }
}

runAll().catch(console.error);
