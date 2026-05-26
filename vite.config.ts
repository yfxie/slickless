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
  },
});
