import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public/static',
    emptyOutDir: false, // okada-profile.jpg 等の静的ファイルは残す
    rollupOptions: {
      input: 'src/client/main.tsx',
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
})
