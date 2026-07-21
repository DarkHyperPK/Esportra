import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  test: { environment: 'jsdom', setupFiles: [path.resolve(__dirname, './src/test/setup.ts')], globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});