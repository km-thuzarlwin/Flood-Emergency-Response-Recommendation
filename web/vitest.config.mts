import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // FERRS logic tests (scoring, routing, filtering, API) run in Node.
    // A jsdom project can be added for component tests in Phase 4.
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
