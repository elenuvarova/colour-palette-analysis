import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

// Flat config. Goal: a working, signal-giving lint that PASSES on the current
// codebase — not a wall of failures. Stylistic/type-pedantry rules are kept as
// warnings (or off) so real bugs stand out; the genuine correctness rule we
// hard-fail on is rules-of-hooks.
export default tseslint.config(
  // Never lint build output or deps.
  { ignores: ["dist/**", "node_modules/**"] },

  // Base JS + TypeScript recommended (non type-checked variant: fast, and it
  // doesn't require a tsconfig project graph to run in CI).
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Correctness: misplaced hooks are real bugs — fail the build.
      "react-hooks/rules-of-hooks": "error",
      // Helpful but noisy in a prototype — warn, don't block.
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Pragmatic relaxations so the existing source lints clean. Prefix-unused
      // is allowed so deliberately-ignored args/vars (e.g. `_`, destructure
      // gaps in the colour-math) don't error.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Test files run under Vitest globals (describe/it/expect/vi) and Node.
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },

  // Config files run in Node (CommonJS-ish module scope handled by `type:module`).
  {
    files: ["*.config.{js,ts}", "*.config.{cjs,mjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
