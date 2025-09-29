import { defineConfig } from "vitest/config"

// Root-level fallback Vitest config. Individual packages can override with their own vitest.config.*.
export default defineConfig({
    test: {
        globals: true,
        environment: "node", // fixed typo
        // Broad include so running from repo root still finds package tests.
        include: ["**/tests/**/*.test.ts"],
        coverage: {
            reporter: ["text", "lcov"],
            provider: "v8",
            thresholds: {
                statements: 50,
                branches: 40,
                functions: 50,
                lines: 50
            }
        }
    }
})