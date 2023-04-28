export default {
  files: ["dist/*.test.js"],
  rootDir: "dist",
  nodeResolve: true,
  testFramework: {
    config: {
      timeout: "30000",
    },
  },
};
