import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const outDir = path.join(rootDir, "docs/parity/row-actions");

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
    "--remote-debugging-port=9223",
    "about:blank",
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const tabsRes = await fetch("http://localhost:9223/json");
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

    const capture = async (filename, waitMs = 800) => {
      await new Promise((r) => setTimeout(r, waitMs));
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      console.log(`Captured ${filename}`);
    };

    const evalClickAll = async (selector, index) => {
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const els = document.querySelectorAll("${selector}");
            if (els && els[${index}]) {
              els[${index}].scrollIntoView({ block: "center" });
              els[${index}].click();
            }
          })()
        `,
      });
      await new Promise((r) => setTimeout(r, 600));
    };

    const viewports = [
      { name: "360", width: 360, height: 800, mobile: true, dsf: 2 },
      { name: "768", width: 768, height: 1024, mobile: false, dsf: 1 },
      { name: "1024", width: 1024, height: 768, mobile: false, dsf: 1 },
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

        // 1. Credentials page
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials",
        });
        await new Promise((r) => setTimeout(r, 1200));
        await setAuthAndTheme(theme);
        await send("Page.navigate", {
          url: "http://localhost:5173/credentials",
        });
        await new Promise((r) => setTimeout(r, 1500));

        // Click first row action menu
        await evalClickAll(
          "table tbody tr button[aria-label='Row actions']",
          0,
        );
        await capture(`credentials_first_row_${theme}_${vp.name}.png`);

        // Close it, then click last row action menu (flip behavior)
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const els = document.querySelectorAll("table tbody tr button[aria-label='Row actions']");
              if (els.length > 1) {
                els[els.length - 1].scrollIntoView({ block: "center" });
                els[els.length - 1].click();
              }
            })()
          `,
        });
        await capture(`credentials_last_row_${theme}_${vp.name}.png`);
      }
    }

    // Capture design system page showcase
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const theme of ["light", "dark"]) {
      await send("Page.navigate", {
        url: "http://localhost:5173/design-system",
      });
      await new Promise((r) => setTimeout(r, 1000));
      await setAuthAndTheme(theme);
      await send("Page.navigate", {
        url: "http://localhost:5173/design-system",
      });
      await new Promise((r) => setTimeout(r, 1500));
      // Scroll to Row Actions Menu card
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const h2 = Array.from(document.querySelectorAll("h2")).find(el => el.textContent.includes("Row Actions Menu"));
            if (h2) h2.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      // Click middle row action menu
      await evalClickAll("button[aria-label='Row actions']", 1);
      await capture(`design_system_row_actions_${theme}_1440.png`);
    }

    ws.close();
    chrome.kill();
    console.log(
      "All parity screenshots captured successfully in docs/parity/row-actions",
    );
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run().catch((err) => {
  console.error("Error capturing parity screenshots:", err);
  process.exit(1);
});
