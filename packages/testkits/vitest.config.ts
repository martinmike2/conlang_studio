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
    coverage: {
      provider: 'v8',
      reporter: ["text", "lcov"],
      thresholds: { statements: 50, branches: 40, functions: 50, lines: 50 }
    }
  }
})