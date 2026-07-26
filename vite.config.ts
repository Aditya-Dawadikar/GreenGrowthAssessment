import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    // Railway (and similar PaaS) route through a dynamic *.up.railway.app
    // host that isn't known at build time, so the default host-header
    // allowlist would reject every request — widen it for the prod preview
    // server only. Dev server (`server` above) keeps the strict default.
    host: true,
    allowedHosts: true,
  },
})
