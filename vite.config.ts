import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { confluencePlugin } from './server/confluence.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react(), confluencePlugin({ url: env.CONFLUENCE_URL, email: env.CONFLUENCE_EMAIL, token: env.CONFLUENCE_TOKEN })],
  server: { proxy: { '/api': { target: 'https://api.cheremha.ru', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') } } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The existing dist directory contains user files.
  build: { outDir: 'build' },
  }
})


