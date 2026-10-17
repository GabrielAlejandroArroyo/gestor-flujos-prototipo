import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["./e2e/reporters/use-case-videos.ts"],
  ],
  use: {
    baseURL: BASE_URL,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    video: { mode: "on", size: { width: 1280, height: 720 } },
    screenshot: "on",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.E2E_BROWSER_CHANNEL
          ? { channel: process.env.E2E_BROWSER_CHANNEL }
          : {}),
      },
      testIgnore: /global\.setup\.ts/,
    },
  ],
});
