import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Standalone Vitest config.
 *
 * Deliberately does NOT import `vite.config.ts`: that file comes from
 * `@lovable.dev/vite-tanstack-config` and pulls in TanStack Start, Nitro,
 * Tailwind and React plugins. Booting all of that to run pure functions would
 * be slow and would couple the unit tests to the app build.
 *
 * Only `.test.ts` files under `src/` are collected. `.test.tsx` is excluded on
 * purpose — nothing here renders components, and the DOM environment is not
 * configured.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".output", ".vinxi"],
  },
});
