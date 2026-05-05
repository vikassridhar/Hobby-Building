import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['benchmark-generic-regulation-annie.trycloudflare.com'],
  },
  build: {
    target: 'es2020',
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
})
