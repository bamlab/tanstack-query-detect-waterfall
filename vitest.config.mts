import { defineConfig } from "vitest/config";

// The library imports `@tanstack/query-core` directly, so the only honest way to
// prove it works on both majors is to run the very same suite twice with that
// specifier resolved to each major. `@tanstack/query-core-v4` is an npm alias
// devDependency (`npm:@tanstack/query-core@^4`).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "query-core-v5",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: {
          alias: [{ find: /^@tanstack\/query-core$/, replacement: "@tanstack/query-core-v4" }],
        },
        test: {
          name: "query-core-v4",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
