/**
 * Standalone SPA build for the Android Capacitor shell.
 *
 * Why a separate config?
 * - The main app uses TanStack Start (SSR on Cloudflare Workers).
 * - A WebView cannot run that SSR runtime; it can only load static files.
 * - This config produces a self-contained CSR bundle in dist/android/ that
 *   Capacitor packages into the APK. It deliberately does NOT use the
 *   TanStack Start plugin — only TanStack Router (for typed routing) +
 *   React + Tailwind, mounted from src/android-entry.tsx.
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
      autoCodeSplitting: false,
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
    rollupOptions: {
      input: resolve(process.cwd(), "android-template/index.html"),
    },
  },
});
