import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  dts: true,
  minify: true,
  clean: true,
  external: ["fs", "events"],
});
