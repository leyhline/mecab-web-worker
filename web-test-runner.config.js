export default {
  files: ["dist/*.test.js"],
  nodeResolve: true,
  testFramework: {
    config: {
      timeout: "60000",
    },
  },
};
