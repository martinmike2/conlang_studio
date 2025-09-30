import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: 'v8',
      reporter: ["text", "lcov"],
      thresholds: { statements: 50, branches: 40, functions: 50, lines: 50 }
    }
  }
})