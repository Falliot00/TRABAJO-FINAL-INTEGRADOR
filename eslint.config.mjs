import js from "@eslint/js";
import { plugin as shadcn } from "@shadcn/lint";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "backend/src/generated/**",
      "playwright-report/**",
      "test-results/**",
      ".agents/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    plugins: { shadcn },
    // No upstream preset: use the rules compatible with our plain CSS frontend.
    // Tailwind theme/component policies are documented in docs/desarrollo.md.
    rules: {
      "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
      "shadcn/no-inline-styles": "error",
      "shadcn/no-raw-colors": "error",
    },
  },
);
