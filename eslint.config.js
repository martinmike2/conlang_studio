// eslint.config.js
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";

export default [
    // Global ignores to prevent linting build artifacts and generated files
    {
        ignores: [
            "**/.next/**",
            "**/dist/**",
            "**/build/**",
            "**/coverage/**",
            "**/node_modules/**",
            "**/next-env.d.ts" // Next.js generated types file – not meant for linting
        ]
    },
    {
        files: ["**/*.{js,ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                process: "readonly",
                __dirname: "readonly",
                module: "readonly",
                require: "readonly"
            }
        },
    },
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        // Exclude declaration files from type-aware linting (mainly generated *.d.ts)
        ignores: ["**/*.d.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: { project: "./tsconfig.json" },
        },
        plugins: { "@typescript-eslint": tsPlugin, "react": reactPlugin },
        rules: {
            // TypeScript recommended rules
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            // React recommended rules
            "react/react-in-jsx-scope": "off",
            "react/jsx-uses-react": "off",
            "react/jsx-uses-vars": "warn"
        },
    },
];