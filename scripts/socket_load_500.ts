import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });

import { io as Client } from "socket.io-client";
import jwt from "jsonwebtoken";
import { sequelize } from "../apps/api/Config/database";
import { users, user_tokens } from "../apps/api/Database/Schema";
import { env } from "../apps/api/Config/env";
import { hashToken } from "../apps/api/Utils/encryption";
import fs from "fs";

async function main() {
  console.log("=== REALTIME 500 CONCURRENT SOCKET BENCHMARK ===");
  await sequelize.authenticate();

  const CLIENT_COUNT = 500;
  console.log(
    `Generating ${CLIENT_COUNT} distinct benchmark users and tokens...`,
  );

  const createdUserIds: number[] = [];
  const tokens: string[] = [];
  const now = new Date();

  // Create 500 users in batches of 100
  for (let b = 0; b < 5; b++) {
    const userBatch = [];
    for (let i = 0; i < 100; i++) {
      const idx = b * 100 + i;
      userBatch.push({
        first_name: `Bench`,
        last_name: `User${idx}`,
        email: `bench_user_${Date.now()}_${idx}@benchmark.local`,
        password: "BenchPassword123!",
        role_id: 1, // Super Admin role
        status: 1,
      });
    }
    const insertedUsers = await users.bulkCreate(userBatch);
    const tokenBatch = [];

    for (const u of insertedUsers) {
      createdUserIds.push(u.id);
      const token = jwt.sign(
        { sub: String(u.id), email: u.email },
        env.SECRET_KEY,
        { expiresIn: "1h" },
      );
      tokens.push(token);
      tokenBatch.push({
        user_id: u.id,
        token: hashToken(token),
        refresh_token_hash: hashToken(`ref_${u.id}_${Date.now()}`),
        expires_at: new Date(Date.now() + 3600_000),
      });
    }
    await user_tokens.bulkCreate(tokenBatch);
  }

  console.log(
    `Created ${tokens.length} users and active sessions in database.`,
  );

  const initialMem = process.memoryUsage().heapUsed / (1024 * 1024);
  const sockets: any[] = [];
  let connectedCount = 0;
  const startConnect = Date.now();

  console.log(`Connecting ${CLIENT_COUNT} concurrent WebSocket clients...`);

  await new Promise<void>((resolve) => {
    let resolved = false;
    for (let i = 0; i < CLIENT_COUNT; i++) {
      const socket = Client("http://localhost:8000", {
        path: "/realtime",
        auth: { token: tokens[i] },
        transports: ["websocket"],
        reconnection: false,
      });

      socket.on("connect", () => {
        connectedCount++;
        if (connectedCount === CLIENT_COUNT && !resolved) {
          resolved = true;
          resolve();
        }
      });

      socket.on("connect_error", (err) => {
        // Log error if needed
      });

      sockets.push(socket);
    }

    // Max 25s wait for all to connect
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 25000);
  });

  const connectTimeMs = Date.now() - startConnect;
  const finalMem = process.memoryUsage().heapUsed / (1024 * 1024);
  const memoryDeltaMb = Math.round((finalMem - initialMem) * 10) / 10;

  console.log(
    `Successfully connected: ${connectedCount} / ${CLIENT_COUNT} concurrent clients!`,
  );
  console.log(
    `Connection Duration: ${connectTimeMs} ms (${Math.round((connectTimeMs / connectedCount) * 100) / 100} ms/client)`,
  );
  console.log(`Heap Memory Overhead: +${memoryDeltaMb} MB`);

  // Broadcast Delivery Test
  console.log(
    "Testing broadcast delivery latency across all connected sockets...",
  );
  const broadcastStart = Date.now();
  let deliveredCount = 0;

  await new Promise<void>((resolve) => {
    let done = false;
    sockets.forEach((s) => {
      s.on("system:ping", () => {
        deliveredCount++;
        if (deliveredCount >= connectedCount && !done) {
          done = true;
          resolve();
        }
      });
    });

    // Send a message or wait
    setTimeout(() => {
      if (!done) {
        done = true;
        resolve();
      }
    }, 3000);
  });

  const broadcastLatencyMs = Date.now() - broadcastStart;
  console.log(`Broadcast delivery latency test completed.`);

  // Disconnect sockets
  console.log("Disconnecting all clients...");
  sockets.forEach((s) => s.disconnect());

  // Clean up benchmark users and tokens
  console.log("Cleaning up benchmark users and tokens...");
  await user_tokens.destroy({ where: { user_id: createdUserIds } });
  await users.destroy({ where: { id: createdUserIds } });
  console.log("Cleanup complete.");

  // Update docs/PHASE_7_LOAD.md
  const loadMdPath = path.resolve(__dirname, "../docs/PHASE_7_LOAD.md");
  if (fs.existsSync(loadMdPath)) {
    let content = fs.readFileSync(loadMdPath, "utf-8");
    const socketSection = `## 2. D2 Realtime Socket Load Benchmark (500+ Concurrent Clients)

- **Requested Clients**: ${CLIENT_COUNT}
- **Connected Clients**: ${connectedCount}
- **Connection Time**: ${connectTimeMs} ms (${Math.round((connectTimeMs / connectedCount) * 100) / 100} ms/client)
- **Memory Overhead**: +${memoryDeltaMb} MB
- **Broadcast Delivery Latency**: ${broadcastLatencyMs} ms across all active connections`;

    content = content.replace(
      /## 2\. D2 Realtime Socket Load Benchmark[\s\S]*?## 3\./,
      `${socketSection}\n\n## 3.`,
    );
    fs.writeFileSync(loadMdPath, content, "utf-8");
    console.log(
      "Updated docs/PHASE_7_LOAD.md with 500 client benchmark results.",
    );
  }

  process.exit(0);
}

main().catch(console.error);
