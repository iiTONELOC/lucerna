import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { subresourceIntegrity } from './scripts/vite/subresourceIntegrity.ts';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash:16][extname]',
        chunkFileNames: 'assets/[name]-[hash:16].js',
        entryFileNames: 'assets/[name]-[hash:16].js',
        hashCharacters: 'hex',
      },
    },
  },
  plugins: [react(), tailwindcss(), subresourceIntegrity()],
  resolve: {
    alias: {
      '@data': new URL('./data', import.meta.url).pathname,
    },
  },
});
