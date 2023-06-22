import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  files: "dist/MecabWorker.test.js",
  nodeResolve: true,
  puppeteer: false,
  playwright: true,
  testFramework: {
    config: {
      timeout: "60000",
    },
  },
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({
      product: "firefox",
      launchOptions: {
        firefoxUserPrefs: {
          "dom.workers.modules.enabled": true,
        },
      },
    }),
  ],
};
