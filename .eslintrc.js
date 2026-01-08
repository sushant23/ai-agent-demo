module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off', // Disabled for type definitions
    'no-console': 'off',
    'no-undef': 'off', // TypeScript handles this
    'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
  },
  env: {
    node: true,
    jest: true,
    es6: true,
  },
};