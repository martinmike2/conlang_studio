module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'react'],
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended'],
  rules: {
  // Prefer explicit typing; treat 'any' as a warning for now so build isn't blocked.
  '@typescript-eslint/no-explicit-any': 'warn'
    ,
    // Next.js uses the automatic JSX runtime; React need not be in scope.
    'react/react-in-jsx-scope': 'off',
    // Some code patterns in the app use logical short-circuit expressions intentionally.
    '@typescript-eslint/no-unused-expressions': 'off'
  },
  settings: {
    react: { version: 'detect' }
  }
}
