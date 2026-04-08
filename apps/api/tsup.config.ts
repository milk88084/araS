import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  target: "node22",
  sourcemap: true,
  clean: true,
  noExternal: ["@repo/shared"],
});
