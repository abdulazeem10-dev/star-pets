import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  publicDir: path.resolve(rootDir, 'public'),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/images': 'http://localhost:3000',
      '/css': 'http://localhost:3000'
    }
  },
  build: {
    outDir: path.resolve(rootDir, '../public-build'),
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
