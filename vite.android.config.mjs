/**
 * Standalone SPA build for the Android Capacitor shell.
 *
 * Produces a self-contained CSR bundle in dist/android/. The post-build
 * script (scripts/prepare-android.sh) flattens dist/android/android-template
 * → dist/android so Capacitor finds dist/android/index.html.
 *
 * Manual chunking keeps the main bundle small (under ~250 kB gzip) by
 * splitting React, the router, query, charts and radix primitives into
 * their own async-loadable chunks.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.SSR": "false",
  },
  build: {
    outDir: "dist/android",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: resolve(process.cwd(), "android-template/index.html"),
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom")) return "react-dom";
          if (id.includes("/react/") || id.includes("\\react\\")) return "react";
          if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router")) return "router";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("zustand") || id.includes("idb-keyval")) return "state";
          return "vendor";
        },
      },
    },
  },
});
