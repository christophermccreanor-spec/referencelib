import { defineConfig } from "vitest/config";
import path from "path";

// Rule-based engines (question decoder, citation audit) have caused two real
// production bugs already (see lib/decoder/concept-extraction.ts and
// lib/citation/audit.ts comments), both found by manual testing after the
// fact. This suite exists so the same class of regex/logic regression is
// caught before a commit reaches main, not after a student hits it live.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
