// Database tests of the website (`*.db.test.ts`): plain Node against throwaway local PostGIS databases, with long timeouts for creating and
// migrating them.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
