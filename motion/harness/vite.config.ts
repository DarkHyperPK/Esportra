import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const repo = path.resolve(__dirname, '../..');

// Capture harness: renders the real scrim pages from src/ with fixture data.
export default defineConfig({
  root: __dirname,
  publicDir: path.join(repo, 'public'),
  plugins: [react()],
  // Placeholders only: every request is answered by mockFetch, nothing leaves the page.
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://placeholder.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('harness-anon-placeholder'),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://api.fixture'),
  },
  resolve: { alias: { '@': path.join(repo, 'src') } },
  server: { port: 5199, strictPort: true, fs: { allow: [repo] } },
  css: { postcss: path.join(repo, 'postcss.config.js') },
});
