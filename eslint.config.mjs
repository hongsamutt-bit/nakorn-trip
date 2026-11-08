import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // three.js is vendored as-is.
  globalIgnores([".next/**", "data/**", "public/viewer/vendor/**"]),
]);
