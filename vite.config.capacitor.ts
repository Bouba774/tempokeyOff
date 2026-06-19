/**
 * Dedicated Vite build for the Android (Capacitor) WebView.
 *
 * This config is INTENTIONALLY independent from the main TanStack Start
 * (SSR) pipeline. It produces a fully static SPA that boots from
 * `capacitor/index.html` and uses TanStack Router with hash history —
 * which is the only safe history mode for a file:// WebView shell.
 *
 * Run:  npx vite build --config vite.config.capacitor.ts
 * Out:  dist/android/  (consumed by Capacitor via webDir)
 */
import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  root: path.resolve(__dirname, "."),
  base: "./",
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, "src/routes"),
      generatedRouteTree: path.resolve(__dirname, "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  define: {
    // Disable any SSR-specific code paths if components branch on this.
    "import.meta.env.SSR": "false",
  },
  build: {
    outDir: path.resolve(__dirname, "dist/android"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    rollupOptions: {
      input: path.resolve(__dirname, "capacitor/index.html"),
    },
  },
});
