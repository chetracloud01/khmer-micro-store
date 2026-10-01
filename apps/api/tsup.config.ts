import { defineConfig } from "tsup";

// One file to run in production. The workspace packages (@khmer-micro-store/*)
// are TypeScript source, so they're bundled in; everything from npm stays external.
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@khmer-micro-store\//],
});
