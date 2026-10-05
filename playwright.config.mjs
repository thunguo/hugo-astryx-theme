import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: {timeout: 8_000},
  reporter: [['list']],
  outputDir: './work/browser-results',
  use: {baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure'},
  projects: [
    {name: 'desktop', use: {browserName: 'chromium', viewport: {width: 1440, height: 1000}}},
    {name: 'mobile', use: {browserName: 'chromium', viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}},
  ],
  webServer: {command: 'node tests/site-fixture.mjs --serve', url: 'http://127.0.0.1:4174', reuseExistingServer: false},
});
