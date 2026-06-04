import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Deterministic key/secret so crypto/session tests don't depend on a real .env.
    env: {
      APP_ENCRYPTION_KEY: "0".repeat(64),
      SESSION_SECRET: "test-session-secret",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
