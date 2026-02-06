import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    electronRenderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  build: {
    // Target modern browsers (Chrome 120+ for Electron 34)
    target: 'chrome120',
    // Enable minification
    minify: 'esbuild',
    // Source maps for debugging
    sourcemap: true,
    // Chunk splitting for vendor code
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
          'vendor-panels': ['react-resizable-panels']
        }
      }
    },
    // Increase chunk size warning limit (default is 500kB)
    chunkSizeWarningLimit: 1000
  },
  // Optimize deps for faster dev startup
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'react-resizable-panels']
  }
});
