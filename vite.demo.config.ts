import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "demo"),
  base: process.env.DEMO_BASE ?? "/slickless/",
  build: {
    outDir: resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      slickless: resolve(__dirname, "src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
