import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "node:url";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser } },
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url))),
  globalIgnores(["apps/server/webpack.config.js", "apps/web/webpack.config.lib.js"]),
  globalIgnores(["static/"])
]);
