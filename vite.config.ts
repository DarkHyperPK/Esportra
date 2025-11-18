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
            // Exclude react-related packages from other chunks
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            // Supabase (might depend on React)
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // UI libraries (depend on React)
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Other node_modules - ensure no React code here
            return 'vendor';
          }
        },
        // Ensure proper chunk ordering
        chunkFileNames: (chunkInfo) => {
          // React vendor should load first
          if (chunkInfo.name === 'react-vendor') {
            return 'assets/react-vendor-[hash].js';
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
