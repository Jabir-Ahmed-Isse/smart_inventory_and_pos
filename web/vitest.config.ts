import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // Stub the server-only Supabase client so pure compute modules import
      // cleanly under the test runner (the pure functions never call it).
      { find: "@/lib/supabase/server", replacement: path.resolve(root, "test/stubs/supabase-server.ts") },
      { find: "@", replacement: path.resolve(root, "src") },
    ],
  },
});
