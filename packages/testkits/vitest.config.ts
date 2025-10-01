import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

const coreDir = resolve(__dirname, "../core")

export default defineConfig({
  resolve: {
    alias: [
      { find: "@core", replacement: coreDir },
      { find: "@core/", replacement: `${coreDir}/` }
    ]
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Increase per-test timeout to avoid flakes in CI where DB setup can be slow
    // Tests previously timed out at the default 5000ms; 30000ms gives ample headroom.
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ["text", "lcov"],
      thresholds: { statements: 50, branches: 40, functions: 50, lines: 50 }
    }
  }
})