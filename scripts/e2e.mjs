import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const playwrightBin = require.resolve("@playwright/test/cli");
const PORT = process.env.E2E_PORT ?? "3100";
const url = `http://127.0.0.1:${PORT}`;
const isWin = process.platform === "win32";

const server = spawn(process.execPath, [nextBin, "start", "-p", PORT], {
  stdio: ["ignore", "inherit", "inherit"],
  env: {
    ...process.env,
    N8N_CHAT_WEBHOOK_URL: "http://127.0.0.1:9/never-called",
  },
  detached: !isWin,
});

async function waitForServer(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(
        `next start exited early with code ${server.exitCode}`,
      );
    }
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Server at ${url} did not become ready within ${timeoutMs}ms`,
  );
}

function stopServer() {
  if (server.exitCode !== null || server.pid === undefined) return;
  if (isWin) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      try {
        server.kill("SIGTERM");
      } catch {}
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopServer();
    process.exit(130);
  });
}

let exitCode = 1;
try {
  await waitForServer();
  const playwright = spawn(
    process.execPath,
    [playwrightBin, "test", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, E2E_BASE_URL: url },
    },
  );
  exitCode = await new Promise((resolve) =>
    playwright.on("exit", (code) => resolve(code ?? 1)),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = 1;
} finally {
  stopServer();
  await new Promise((resolve) => {
    if (server.exitCode !== null) {
      resolve();
    } else {
      server.once("exit", resolve);
      setTimeout(resolve, 5000);
    }
  });
}
process.exit(exitCode);
