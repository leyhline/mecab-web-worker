import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  nodeResolve: true,
  puppeteer: false,
  playwright: true,
  testFramework: {
    config: {
      timeout: "60000",
    },
  },
  groups: [
    {
      name: "chromium",
      files: "dist/MecabWorker.test.js",
      browsers: [playwrightLauncher({ product: "chromium" })],
    },
    {
      name: "firefox",
      files: "dist/MecabWorker.firefox.test.js",
      browsers: [playwrightLauncher({ product: "firefox" })],
    },
  ],
};
