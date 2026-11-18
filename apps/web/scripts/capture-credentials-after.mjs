import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const outDir = path.join(rootDir, "docs/parity/after/credentials");

fs.mkdirSync(outDir, { recursive: true });

async function getAdminSession() {
  const envPath = path.resolve(rootDir, "apps/api/.env");
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
      email: env.SUPER_ADMIN_EMAIL || "anurag.r@droptechnolab.com",
      password: env.SUPER_ADMIN_PASSWORD || "Admin@1234567890",
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
  console.log("Logged in successfully as Super Admin");

  const chrome = spawn("google-chrome", [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=9225",
    "about:blank",
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabsRes = await fetch("http://localhost:9225/json");
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

    const authState = JSON.stringify({
      state: {
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
        isAuthenticated: true,
      },
      version: 0,
    });

    const setAuthAndTheme = async (theme = "light") => {
      await send("Runtime.evaluate", {
        expression: `
          localStorage.setItem('token', '${session.token}');
          localStorage.setItem('refresh_token', '${session.refreshToken}');
          localStorage.setItem('itam-auth', '${authState.replace(/'/g, "\\'")}');
          localStorage.setItem('vite-ui-theme', '${theme}');
          if ('${theme}' === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        `,
      });
    };

    const capture = async (filename, waitMs = 1000) => {
      await new Promise((r) => setTimeout(r, waitMs));
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      console.log(`Captured ${filename}`);
    };

    const viewports = [
      { name: "360", width: 360, height: 800, mobile: true, dsf: 2 },
      { name: "1440", width: 1440, height: 900, mobile: false, dsf: 1 },
    ];

    for (const theme of ["light", "dark"]) {
      for (const vp of viewports) {
        await send("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.dsf,
          mobile: vp.mobile,
        });

        // 1. Credentials list
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials",
        });
        await new Promise((r) => setTimeout(r, 1200));
        await setAuthAndTheme(theme);
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials",
        });
        await capture(`credentials_list_${theme}_${vp.name}.png`, 1500);

        // 2. Add Credential Drawer Form
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const buttons = Array.from(document.querySelectorAll("button"));
              const btn = buttons.find(b => b.textContent && b.textContent.includes("Add credential"));
              if (btn) btn.click();
            })()
          `,
        });
        await capture(`credentials_add_dialog_${theme}_${vp.name}.png`, 1000);

        // 3. Credential Approvals
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials/approvals",
        });
        await capture(`credential_approvals_${theme}_${vp.name}.png`, 1500);

        // 4. Credential Requests
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials/requests",
        });
        await capture(`credential_requests_${theme}_${vp.name}.png`, 1500);

        // 5. Credential Types
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials/types",
        });
        await capture(`credential_types_${theme}_${vp.name}.png`, 1500);

        // 6. Access Logs
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials/access-logs",
        });
        await capture(`credential_access_logs_${theme}_${vp.name}.png`, 1500);

        // 7. EmployeeDetail Accounts tab
        await send("Page.navigate", {
          url: "http://localhost:5173/employees/1",
        });
        await new Promise((r) => setTimeout(r, 1500));
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const buttons = Array.from(document.querySelectorAll("button"));
              const btn = buttons.find(b => b.textContent && b.textContent.includes("Accounts"));
              if (btn) btn.click();
            })()
          `,
        });
        await capture(`employee_detail_accounts_${theme}_${vp.name}.png`, 1000);

        // 8. Portal Accounts
        await send("Page.navigate", {
          url: "http://localhost:5173/portal/accounts",
        });
        await capture(`portal_accounts_${theme}_${vp.name}.png`, 1500);
      }
    }

    ws.close();
    chrome.kill();
    console.log(
      "All 'after' parity screenshots captured successfully in docs/parity/after/credentials",
    );
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run().catch((err) => {
  console.error("Error capturing after screenshots:", err);
  process.exit(1);
});
