import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { a3payDemoMockApi } from "./src/views/a3pay-demo/mock-api";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appDir,
  plugins: [a3payDemoMockApi(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(appDir, "./src"),
      "@siteportfolio": path.resolve(appDir, "../../siteportfolio/src"),
    },
  },
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
  },
});
