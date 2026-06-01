import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Slickless",
      // ESM → slickless.js (used by `exports.import`)
      // UMD → slickless.umd.cjs (used by `exports.require`; also works in CJS)
      fileName: (format) => (format === "es" ? "slickless.js" : "slickless.umd.cjs"),
      formats: ["es", "umd"],
    },
    sourcemap: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        exports: "named",
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith(".css")) return "slickless.css";
          return "[name][extname]";
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Tests live alongside the source's behaviour, but the public surface
      // is `index.ts` + `slickless.ts`. `types.ts` and `defaults.ts` are
      // declarations / data with no executable branches, so excluding them
      // keeps the coverage % focused on code that actually has logic.
      exclude: ["src/types.ts", "src/defaults.ts", "src/index.ts"],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});
