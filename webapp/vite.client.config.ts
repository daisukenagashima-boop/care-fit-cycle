import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // tsconfig.jsonに "jsxImportSource": "hono/jsx" が設定されているため、
  // クライアントビルドではReactを使うよう上書きする
  esbuild: {
    jsxImportSource: 'react',
  },
  publicDir: false,
  build: {
    outDir: 'public/static',
    emptyOutDir: false,
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
