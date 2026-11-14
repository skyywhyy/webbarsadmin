import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'https://api.cheremha.ru', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') } } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The existing dist directory contains user files.
  build: { outDir: 'build' },
})


