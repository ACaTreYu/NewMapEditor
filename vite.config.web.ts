import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Web-only Vite config — no Electron plugins.
 * Builds a static SPA deployable to any web server.
 */
export default defineConfig({
  plugins: [react()],
  base: '/AC-Map-Editor-Online/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist-web',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.web.html'),
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
          'vendor-panels': ['react-resizable-panels'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'react-resizable-panels', 'pako'],
  },
});
