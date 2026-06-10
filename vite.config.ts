/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function isReactEcosystem(id: string) {
  return [
    "/react/",
    "/react-dom/",
    "/scheduler/",
    "/use-sync-external-store",
    "\\react\\",
    "\\react-dom\\",
    "\\scheduler\\",
  ].some((segment) => id.includes(segment));
}

function isUiPrimitives(id: string) {
  return (
    id.includes("@radix-ui")
    || id.includes("@floating-ui")
    || id.includes("/cmdk/")
  );
}

function isReactUiSupport(id: string) {
  return [
    "react-remove-scroll",
    "react-style-singleton",
    "use-callback-ref",
    "use-sidecar",
    "aria-hidden",
    "/lodash/",
    "\\lodash\\",
  ].some((segment) => id.includes(segment));
}

function resolveVendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return;

  if (id.includes("@sentry/react")) return "vendor-react";

  if (isReactEcosystem(id) || isUiPrimitives(id) || isReactUiSupport(id)) {
    return "vendor-react";
  }

  if (id.includes("@remix-run/router") || id.includes("react-router")) {
    return "vendor-router";
  }
  if (
    id.includes("framer-motion")
    || id.includes("motion-dom")
    || id.includes("motion-utils")
  ) {
    return "vendor-framer";
  }
  if (id.includes("@tanstack")) return "vendor-tanstack";
  if (id.includes("lucide-react")) return "vendor-lucide";
  if (id.includes("@supabase")) return "vendor-supabase";
  if (id.includes("@microsoft/signalr")) return "vendor-signalr";
  if (id.includes("@sentry")) return "vendor-sentry";
  if (
    id.includes("zod")
    || id.includes("react-hook-form")
    || id.includes("@hookform")
  ) {
    return "vendor-forms";
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 3000,
    open: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Set base path for subdirectory deployment
    // For subdomain demo.esportra.com pointing to public_html/demo/, use '/'
    // If you need a subdirectory path, use '/demo/' instead
    base: '/',
    rollupOptions: {
      output: {
        manualChunks(id) {
          return resolveVendorChunk(id);
        },
        // Standard chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Ensure common chunks are properly handled
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  define: {
    global: 'globalThis',
  },
  envPrefix: 'VITE_',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
}));
