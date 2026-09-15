import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Browser cases drive one Chrome through ChromeDriver against the running dev stack,
// so they stay out of the fast unit run in vitest.config.ts.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    testTimeout: 90_000,
    hookTimeout: 60_000,
    // One browser at a time: the cases share the dev stack and its research database.
    fileParallelism: false,
    maxWorkers: 1,
  },
});
