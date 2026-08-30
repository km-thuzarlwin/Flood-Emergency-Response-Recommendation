import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // FERRS logic tests run in Node; component tests (Phase 4) can add a jsdom project.
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    // loads web/.env so the opt-in integration test can see DATABASE_URL / FERRS_PROLOG_URL
    setupFiles: ["./vitest.setup.ts"],
    // the opt-in integration test talks to a remote pooled DB (round-trips to Seoul)
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
