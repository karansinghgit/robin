import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".webpack/**", "node_modules/**", "out/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: [
      "src/main/**/*.{ts,tsx}",
      "src/preload/**/*.{ts,tsx}",
      "src/shared/**/*.{ts,tsx}",
      "test/**/*.ts"
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
