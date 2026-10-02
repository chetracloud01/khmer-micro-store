import { defineConfig } from "vitest/config";

// The worker's tests share one real database and each delivery round takes
// every waiting message, so the test files run one after another.
export default defineConfig({
  test: { fileParallelism: false },
});
