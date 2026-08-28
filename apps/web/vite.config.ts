import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

// The committed /data directory lives at the repo root, not under apps/web.
// In production, deploy.yml copies it into dist/data after `vite build`. In
// dev, this plugin serves it directly so `fetch('./data/...')` works without
// needing a symlink (which doesn't survive a plain git clone on Windows).
function serveRootData(): Plugin {
  const dataDir = join(currentDir, "..", "..", "data");
  return {
    name: "serve-root-data",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/data/")) return next();
        const filePath = join(dataDir, req.url.replace(/^\/data\//, "").split("?")[0]);
        if (!existsSync(filePath)) return next();
        res.setHeader("Content-Type", "application/json");
        res.end(await readFile(filePath));
      });
    },
  };
}

// base: "./" (relative asset paths) works for a GitHub Pages project site
// regardless of the repo name, and pairs with HashRouter so no server-side
// rewrite / 404.html fallback is needed for client-side routing.
export default defineConfig({
  plugins: [react(), serveRootData()],
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
