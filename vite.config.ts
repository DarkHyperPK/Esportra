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
            // Supabase (doesn't depend on React) - ONLY truly standalone packages
            // Check this FIRST before anything else
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // EVERYTHING ELSE goes to react-vendor to ensure React loads first
            // This is the safest approach - if it's not Supabase, it goes with React
            return 'react-vendor';
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
