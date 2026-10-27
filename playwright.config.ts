import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://sauce-demo.myshopify.com";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sin reintentos en local: un reintento esconde un test inestable. La estabilidad
  // se demuestra con --repeat-each (ver docs/verification.md).
  retries: process.env.CI ? 1 : 0,
  // Sitio público de demo: carga mínima, nada de paralelismo agresivo.
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-GB",
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
    },
    {
      name: "ui-chromium",
      testDir: "./tests/ui",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
