import { defineConfig, devices } from '@playwright/test';

enum PlaywrightPath {
  Tests = './e2e_tests',
}

enum PlaywrightTimeMilliseconds {
  Assertion = 10_000,
  Server = 30_000,
  Test = 45_000,
}

enum PlaywrightWorkerCount {
  Single = 1,
}

enum PlaywrightServer {
  Command = 'bun run serve:dist',
  Url = 'http://127.0.0.1:4173',
}

enum PlaywrightProfile {
  Android = 'Pixel 7',
  AndroidName = 'android',
  Desktop = 'Desktop Chrome',
  DesktopName = 'desktop',
  Ios = 'iPhone 13',
  IosName = 'ios',
  Tablet = 'iPad Pro 11',
  TabletName = 'tablet',
}

export default defineConfig({
  expect: {
    timeout: PlaywrightTimeMilliseconds.Assertion,
  },
  forbidOnly: process.env['CI'] !== undefined,
  fullyParallel: false,
  projects: [
    {
      name: PlaywrightProfile.DesktopName,
      use: { ...devices[PlaywrightProfile.Desktop] },
    },
    {
      name: PlaywrightProfile.TabletName,
      use: { ...devices[PlaywrightProfile.Tablet] },
    },
    {
      name: PlaywrightProfile.IosName,
      use: { ...devices[PlaywrightProfile.Ios] },
    },
    {
      name: PlaywrightProfile.AndroidName,
      use: { ...devices[PlaywrightProfile.Android] },
    },
  ],
  reporter: process.env['CI'] === undefined ? 'list' : 'github',
  testDir: PlaywrightPath.Tests,
  testMatch: '**/*.e2e.ts',
  timeout: PlaywrightTimeMilliseconds.Test,
  use: {
    baseURL: PlaywrightServer.Url,
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: PlaywrightServer.Command,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: PlaywrightTimeMilliseconds.Server,
    url: PlaywrightServer.Url,
  },
  workers: PlaywrightWorkerCount.Single,
});
