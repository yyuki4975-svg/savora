import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output and recoverable local archives are not source files.
    // Source: https://eslint.org/docs/latest/use/configure/ignore
    "dist/**",
    "server/node/dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".run/**",
  ]),
]);

export default eslintConfig;
