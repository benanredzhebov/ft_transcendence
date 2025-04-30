import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.', // Root directory for Vite
  build: {
    outDir: 'dist', // Output directory for the build
    rollupOptions: {
      input: './index.html', // Entry point for the build
    },
  },
  plugins: [react()],
});