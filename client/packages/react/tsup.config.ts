import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // Required for Next.js App Router (and any RSC-aware bundler): these
  // hooks use useState/useEffect/useContext, so every consumer of this
  // package needs a client boundary. Baking the directive into the build
  // output means consumers don't have to add "use client" themselves.
  banner: {
    js: '"use client";',
  },
});
