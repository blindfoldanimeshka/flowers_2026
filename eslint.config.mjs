import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // React правила
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      
      // Next.js правила
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",
      
      // TypeScript правила
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-const": "error",
      
      // Общие правила
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      
      // Импорты
      "import/order": [
        "error",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index"
          ],
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          }
        }
      ]
    }
  }
];

export default eslintConfig;
