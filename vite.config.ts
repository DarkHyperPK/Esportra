import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 3000,
    open: true,
  },
  plugins: [
    react({
      // Explicitly enable Fast Refresh for better HMR experience
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // Set base path for subdirectory deployment
    // For subdomain demo.esportra.com pointing to public_html/demo/, use '/'
    // If you need a subdirectory path, use '/demo/' instead
    base: '/',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // CRITICAL: React and React-DOM must be in the same chunk and load first
          if (id.includes('node_modules')) {
            // React core must be together - check for exact react package paths
            if (
              id.includes('/react/') || 
              id.includes('/react-dom/') || 
              id.includes('\\react\\') || 
              id.includes('\\react-dom\\') ||
              id.includes('react-router')
            ) {
              return 'react-vendor';
            }
            // ALL React-dependent packages must be in react-vendor or load after it
            // These packages use React.forwardRef, React.useState, React.createContext, useLayoutEffect, etc.
            if (
              id.includes('react-hook-form') || 
              id.includes('@hookform') ||
              id.includes('embla-carousel-react') ||
              id.includes('framer-motion') ||
              id.includes('lucide-react') ||
              id.includes('react-day-picker') ||
              id.includes('react-hot-toast') ||
              id.includes('react-resizable-panels') ||
              id.includes('react-select') ||
              id.includes('react-svg-pan-zoom') ||
              id.includes('recharts') ||
              id.includes('styled-components') ||
              id.includes('sonner') ||
              id.includes('vaul') ||
              id.includes('next-themes') ||
              id.includes('cmdk') ||
              id.includes('input-otp') ||
              id.includes('@emotion') || // Used by styled-components
              id.includes('@tanstack/react-query') ||
              id.includes('@tanstack/react') ||
              id.includes('@g-loot/react') ||
              id.includes('use-isomorphic-layout-effect') || // React hook dependency - uses useLayoutEffect
              id.includes('@testing-library/react') ||
              id.includes('react-transition-group') ||
              id.includes('@floating-ui') || // Used by Radix UI, uses useLayoutEffect
              id.includes('@radix-ui/react-popper') || // Uses @floating-ui
              id.includes('react-refresh') // React development tool
            ) {
              return 'react-vendor'; // Put all React-dependent packages with React
            }
            // Supabase (doesn't depend on React)
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // UI libraries (depend on React) - but they're already handled above via @radix-ui check
            if (id.includes('@radix-ui')) {
              return 'react-vendor'; // Radix UI needs React, so put it with React
            }
            // Other node_modules - ensure no React dependencies
            return 'vendor';
          }
        },
        // Ensure proper chunk ordering - react-vendor must load first
        chunkFileNames: (chunkInfo) => {
          // React vendor should load first - prefix with 0 to ensure it's first alphabetically
          if (chunkInfo.name === 'react-vendor') {
            return 'assets/0-react-vendor-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
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
}));
