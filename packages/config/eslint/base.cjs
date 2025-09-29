module.exports = {
    root: false,
    env: { node: true, es2024: true, browser: true },
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "unused-imports"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
    rules: {
        "unused-imports/no-unused-imports": "error",
        "@typescript-eslint/consistent-type-imports": "warn",
        "no-console": ["warn", { allow: ["warn", "error"] }],
    }
}