import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'popup.html',
        background: 'src/background.js'
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
