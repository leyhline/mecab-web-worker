import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  files: "dist/MecabWorker.test.js",
  nodeResolve: true,
  puppeteer: false,
  playwright: true,
  testFramework: {
    config: {
      ui: "bdd",
      timeout: "60000",
    },
  },
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({ product: "firefox"  }),
  ],
};
