import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    globals: true,

    setupFiles: [
      "./tests/setup.ts",
    ],

    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
    ],

    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
    ],

    testTimeout: 30000,

    hookTimeout: 60000,

    fileParallelism: false,

    clearMocks: true,

    restoreMocks: true,

    env: {
      NODE_ENV: "test",
    },

    coverage: {
      provider: "v8",

      reporter: [
        "text",
        "html",
        "json",
      ],

      reportsDirectory: "./coverage",

      include: [
        "src/**/*.ts",
      ],

      exclude: [
        "src/server.ts",
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
      ],
    },
  },
});