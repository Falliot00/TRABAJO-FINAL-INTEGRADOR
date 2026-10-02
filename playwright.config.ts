import { defineConfig, devices } from "@playwright/test";
import { apiOrigin, appOrigin, serverEnvironment } from "./e2e/environment";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: appOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node backend/dist/main.js",
      url: `${apiOrigin}/api/health`,
      env: serverEnvironment(),
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command:
        "pnpm --filter @cilgas/frontend exec vite --host 127.0.0.1 --port 4173 --strictPort",
      url: appOrigin,
      env: { API_PROXY_TARGET: apiOrigin },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
