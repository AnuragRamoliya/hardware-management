import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const beforeDir = path.join(rootDir, "docs/parity/before");

fs.mkdirSync(beforeDir, { recursive: true });

async function getAdminSession() {
  const envPath = path.resolve(rootDir, "../hardware-mnagement-api/.env");
  const envContent = fs.readFileSync(envPath, "utf8");
  const env = Object.fromEntries(
    envContent
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [
        l.slice(0, l.indexOf("=")).trim(),
        l.slice(l.indexOf("=") + 1).trim(),
      ]),
  );

  const res = await fetch("http://localhost:8000/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "plain-text": "true" },
    body: JSON.stringify({
      email: env.SUPER_ADMIN_EMAIL,
      password: env.SUPER_ADMIN_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!data?.data?.token)
    throw new Error("Failed to log in: " + JSON.stringify(data));
  return {
    token: data.data.token,
    refreshToken: data.data.refresh_token,
    user: data.data.user,
  };
}

async function run() {
  const session = await getAdminSession();
  console.log("Logged in successfully as Admin");

  const chrome = spawn("google-chrome", [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=9222",
    "about:blank",
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const tabsRes = await fetch("http://localhost:9222/json");
    const tabs = await tabsRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let id = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const msgId = id++;
        pending.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

    await new Promise((r) => (ws.onopen = r));

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send("Page.navigate", { url: "http://localhost:5173/login" });
    await new Promise((r) => setTimeout(r, 1000));

    const authState = JSON.stringify({
      state: {
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
        isAuthenticated: true,
      },
      version: 0,
    });

    await send("Runtime.evaluate", {
      expression: `
        localStorage.setItem('token', '${session.token}');
        localStorage.setItem('refresh_token', '${session.refreshToken}');
        localStorage.setItem('itam-auth', '${authState.replace(/'/g, "\\'")}');
      `,
    });

    const viewports = [
      { name: "1440", width: 1440, height: 900, mobile: false, dsf: 1 },
      { name: "360", width: 360, height: 800, mobile: true, dsf: 2 },
    ];

    const capture = async (filename, waitMs = 1200) => {
      await new Promise((r) => setTimeout(r, waitMs));
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const outPath = path.join(beforeDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      console.log(`Captured ${filename}`);
    };

    const evalClick = async (selector) => {
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const el = document.querySelector("${selector}");
            if (el) el.click();
          })()
        `,
      });
      await new Promise((r) => setTimeout(r, 600));
    };

    for (const vp of viewports) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.dsf,
        mobile: vp.mobile,
      });

      // 1. Employees list (golden reference)
      await send("Page.navigate", { url: "http://localhost:5173/employees" });
      await capture(`employees_list_${vp.name}.png`, 1500);

      // 2. Employee detail
      await send("Page.navigate", { url: "http://localhost:5173/employees/1" });
      await capture(`employee_detail_${vp.name}.png`, 1500);

      // 2b. Employee detail Hardware tab
      await evalClick("button[role='tab']:nth-of-type(2)");
      await capture(`employee_detail_hardware_${vp.name}.png`, 800);

      // 2c. Employee detail Software tab
      await evalClick("button[role='tab']:nth-of-type(3)");
      await capture(`employee_detail_software_${vp.name}.png`, 800);

      // 3. Assets list
      await send("Page.navigate", { url: "http://localhost:5173/assets" });
      await capture(`assets_list_${vp.name}.png`, 1500);

      // 3b. Assets add dialog
      await evalClick("header button:has(svg.lucide-plus)");
      await capture(`assets_add_dialog_${vp.name}.png`, 800);
      await send("Runtime.evaluate", {
        expression: `document.querySelector("button[type='button']")?.click()`,
      });

      // 4. Assets unassigned
      await send("Page.navigate", {
        url: "http://localhost:5173/assets/unassigned",
      });
      await capture(`assets_unassigned_${vp.name}.png`, 1500);

      // 5. Asset detail
      await send("Page.navigate", { url: "http://localhost:5173/assets/1" });
      await capture(`asset_detail_${vp.name}.png`, 1500);

      // 5b. Asset detail tabs
      await evalClick("div[role='tablist'] button:nth-of-type(2)");
      await capture(`asset_detail_history_${vp.name}.png`, 800);
      await evalClick("div[role='tablist'] button:nth-of-type(3)");
      await capture(`asset_detail_maintenance_${vp.name}.png`, 800);
      await evalClick("div[role='tablist'] button:nth-of-type(4)");
      await capture(`asset_detail_accessories_${vp.name}.png`, 800);
      await evalClick("div[role='tablist'] button:nth-of-type(5)");
      await capture(`asset_detail_activity_${vp.name}.png`, 800);

      // 6. Maintenance list
      await send("Page.navigate", {
        url: "http://localhost:5173/asset-maintenance",
      });
      await capture(`maintenance_list_${vp.name}.png`, 1500);

      // 7. Software list
      await send("Page.navigate", { url: "http://localhost:5173/software" });
      await capture(`software_list_${vp.name}.png`, 1500);

      // 7b. Software add dialog
      await evalClick("header button:has(svg.lucide-plus)");
      await capture(`software_add_dialog_${vp.name}.png`, 800);
      await send("Runtime.evaluate", {
        expression: `document.querySelector("button[type='button']")?.click()`,
      });

      // 8. Software detail
      await send("Page.navigate", { url: "http://localhost:5173/software/1" });
      await capture(`software_detail_${vp.name}.png`, 1500);

      // 8b. Software detail tabs
      await evalClick("div[role='tablist'] button:nth-of-type(2)");
      await capture(`software_detail_licenses_${vp.name}.png`, 800);
      await evalClick("div[role='tablist'] button:nth-of-type(3)");
      await capture(`software_detail_users_${vp.name}.png`, 800);
      await evalClick("div[role='tablist'] button:nth-of-type(4)");
      await capture(`software_detail_activity_${vp.name}.png`, 800);

      // 9. Dashboard
      await send("Page.navigate", { url: "http://localhost:5173/dashboard" });
      await capture(`dashboard_${vp.name}.png`, 1500);

      // 10. Notifications
      await send("Page.navigate", {
        url: "http://localhost:5173/notifications",
      });
      await capture(`notifications_${vp.name}.png`, 1500);

      // 11. Portal assets & software
      await send("Page.navigate", {
        url: "http://localhost:5173/portal/assets",
      });
      await capture(`portal_assets_${vp.name}.png`, 1500);
      await send("Page.navigate", {
        url: "http://localhost:5173/portal/software",
      });
      await capture(`portal_software_${vp.name}.png`, 1500);
    }

    console.log("All before screenshots captured successfully!");
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
