module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  ignorePatterns: ["dist/", "node_modules/", "*.config.js", "*.config.cjs"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/triple-slash-reference": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      files: ["backend/src/**/*.ts", "shared/src/**/*.ts", "**/backend/src/**/*.ts", "**/shared/src/**/*.ts", "**/backend/src/**/*.d.ts"],
      env: {
        node: true,
      },
      rules: {
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    {
      files: ["frontend/src/**/*.ts", "frontend/src/**/*.tsx", "src/**/*.ts", "src/**/*.tsx"],
      env: {
        browser: true,
        node: true,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  ],
};
