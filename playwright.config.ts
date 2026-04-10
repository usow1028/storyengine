import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: "http://127.0.0.1:4178"
  },
  webServer: {
    command: "npm run build && npm run inspection:test-server",
    port: 4178,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
