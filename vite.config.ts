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
    react(),
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
          if (id.includes('node_modules')) {
            // Split out truly independent massive libraries
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@supabase')) return 'vendor-supabase';

            // Keep React and all its related component libraries together
            return 'vendor-main';
          }
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
}));
